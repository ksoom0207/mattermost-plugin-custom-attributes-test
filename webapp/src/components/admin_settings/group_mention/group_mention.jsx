import React from 'react';
import PropTypes from 'prop-types';

import UsersInput from '../users_input';
import TeamsInput from '../teams_input';

export default class GroupMention extends React.Component {
    static propTypes = {
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string,
        displayName: PropTypes.string,
        users: PropTypes.array,
        teams: PropTypes.array,
        groups: PropTypes.array,
        hideDelete: PropTypes.bool,
        onDelete: PropTypes.func,
        onChange: PropTypes.func.isRequired,
        actions: PropTypes.shape({
            getProfilesByIds: PropTypes.func.isRequired,
            getTeam: PropTypes.func.isRequired,
        }).isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            name: this.props.name,
            displayName: this.props.displayName,
            groups: this.props.groups,
            error: null,
        };

        this.initUsers();
        this.initTeams();
    }

    // initUsers fetches user profiles for the users ids passed in props
    async initUsers() {
        if (!this.props.users || !this.props.users.length) {
            return;
        }

        const profiles = await this.props.actions.getProfilesByIds(this.props.users);

        let users = profiles.data;

        if (users.length !== this.props.users.length) {
            const unknownIds = this.props.users.filter((userId) =>
                !users.find((user) => user.id === userId),
            );
            users = users.concat(unknownIds);
        }

        this.setState({users});
    }

    // initTeams fetches teams informations for the teams ids passed in props
    async initTeams() {
        if (!this.props.teams || !this.props.teams.length) {
            return;
        }

        const teamPromises = this.props.teams.map(this.props.actions.getTeam);
        const responses = await Promise.all(teamPromises);
        const teams = responses.filter((res) => !res.error).map((res) => res.data);

        this.setState({teams});
    }

    handleNameInput = (e) => {
        const value = e.target.value;

        // Validate mention name (alphanumeric, dash, underscore only)
        const validPattern = /^[a-zA-Z0-9\-_]*$/;
        if (!validPattern.test(value)) {
            this.setState({error: 'Mention name can only contain letters, numbers, dashes, and underscores.'});
        } else if (!value || value.trim() === '') {
            this.setState({error: 'Mention name cannot be empty.'});
        } else if (!this.state.displayName || this.state.displayName.trim() === '') {
            this.setState({error: 'Display name cannot be empty.'});
        } else if (!this.validateMembers()) {
            this.setState({error: 'Group mention must include at least one user, team or group.'});
        } else {
            this.setState({error: null});
        }

        this.setState({name: value});
        this.props.onChange({
            id: this.props.id,
            name: value,
            displayName: this.state.displayName,
            users: this.state.users,
            teams: this.state.teams,
            groups: this.state.groups,
        });
    };

    handleDisplayNameInput = (e) => {
        const value = e.target.value;

        if (!value || value.trim() === '') {
            this.setState({error: 'Display name cannot be empty.'});
        } else if (!this.state.name || this.state.name.trim() === '') {
            this.setState({error: 'Mention name cannot be empty.'});
        } else if (!this.validateMembers()) {
            this.setState({error: 'Group mention must include at least one user, team or group.'});
        } else {
            this.setState({error: null});
        }

        this.setState({displayName: value});
        this.props.onChange({
            id: this.props.id,
            name: this.state.name,
            displayName: value,
            users: this.state.users,
            teams: this.state.teams,
            groups: this.state.groups,
        });
    };

    validateMembers = () => {
        const usersEmpty = !this.state.users || !this.state.users.length;
        const teamsEmpty = !this.state.teams || !this.state.teams.length;
        const groupsEmpty = !this.state.groups || this.state.groups.trim() === '';

        return !usersEmpty || !teamsEmpty || !groupsEmpty;
    };

    handleUsersInput = (userIds) => {
        if (!this.validateMembersWithNewValue(userIds, this.state.teams, this.state.groups)) {
            this.setState({error: 'Group mention must include at least one user, team or group.'});
        } else if (this.state.name && this.state.displayName) {
            this.setState({error: null});
        }

        this.setState({users: userIds});
        this.props.onChange({
            id: this.props.id,
            name: this.state.name,
            displayName: this.state.displayName,
            users: userIds,
            teams: this.state.teams,
            groups: this.state.groups,
        });
    };

    handleTeamsInput = (teamsIds) => {
        if (!this.validateMembersWithNewValue(this.state.users, teamsIds, this.state.groups)) {
            this.setState({error: 'Group mention must include at least one user, team or group.'});
        } else if (this.state.name && this.state.displayName) {
            this.setState({error: null});
        }

        this.setState({teams: teamsIds});
        this.props.onChange({
            id: this.props.id,
            name: this.state.name,
            displayName: this.state.displayName,
            users: this.state.users,
            teams: teamsIds,
            groups: this.state.groups,
        });
    };

    handleGroupsInput = (e) => {
        const value = e.target.value;

        if (!this.validateMembersWithNewValue(this.state.users, this.state.teams, value)) {
            this.setState({error: 'Group mention must include at least one user, team or group.'});
        } else if (this.state.name && this.state.displayName) {
            this.setState({error: null});
        }

        this.setState({groups: value});
        this.props.onChange({
            id: this.props.id,
            name: this.state.name,
            displayName: this.state.displayName,
            users: this.state.users,
            teams: this.state.teams,
            groups: value,
        });
    };

    validateMembersWithNewValue = (users, teams, groups) => {
        const usersEmpty = !users || !users.length;
        const teamsEmpty = !teams || !teams.length;
        const groupsEmpty = !groups || groups.trim() === '';

        return !usersEmpty || !teamsEmpty || !groupsEmpty;
    };

    handleDelete = () => {
        this.props.onDelete(this.props.id);
    };

    render() {
        let deleteButton = null;
        if (!this.props.hideDelete) {
            deleteButton = (
                <div className='col-xs-12 col-sm-1'>
                    <a
                        style={styles.deleteIcon}
                        onClick={this.handleDelete}
                    >
                        <i className='fa fa-trash'/>
                    </a>
                </div>
            );
        }

        let errorLabel = null;
        if (this.state.error) {
            errorLabel = this.state.error;
        }

        return (
            <div style={styles.groupMentionRow}>
                <div style={styles.groupHeader}>
                    <strong>{'@' + (this.state.name || 'groupname')}</strong>
                    {this.state.displayName && (
                        <span style={styles.displayName}>{' - ' + this.state.displayName}</span>
                    )}
                </div>
                <div className='row'>
                    <div className='col-xs-12 col-sm-2'>
                        <input
                            id={`name-${this.props.id}`}
                            className='form-control'
                            type='text'
                            placeholder='groupname'
                            value={this.state.name}
                            onChange={this.handleNameInput}
                        />
                        <small style={styles.fieldLabel}>{'Mention Name'}</small>
                    </div>
                    <div className='col-xs-12 col-sm-2'>
                        <input
                            id={`displayName-${this.props.id}`}
                            className='form-control'
                            type='text'
                            placeholder='Display Name'
                            value={this.state.displayName}
                            onChange={this.handleDisplayNameInput}
                        />
                        <small style={styles.fieldLabel}>{'Display Name'}</small>
                    </div>
                    <div className='col-xs-12 col-sm-3'>
                        <UsersInput
                            placeholder='@username1 @username2'
                            users={this.state.users}
                            onChange={this.handleUsersInput}
                        />
                        <small style={styles.fieldLabel}>{'Users'}</small>
                    </div>
                    <div className='col-xs-12 col-sm-2'>
                        <TeamsInput
                            placeholder='teamName1 teamName2'
                            teams={this.state.teams}
                            onChange={this.handleTeamsInput}
                        />
                        <small style={styles.fieldLabel}>{'Teams'}</small>
                    </div>
                    <div className='col-xs-12 col-sm-2'>
                        <input
                            id={`groups-${this.props.id}`}
                            className='form-control'
                            type='text'
                            placeholder='GroupID1 GroupID2'
                            value={this.state.groups}
                            onChange={this.handleGroupsInput}
                        />
                        <small style={styles.fieldLabel}>{'Group IDs'}</small>
                    </div>
                    {deleteButton}
                </div>
                <div style={styles.errorLabel}>
                    {errorLabel}
                </div>
            </div>
        );
    }
}

const styles = {
    groupMentionRow: {
        margin: '12px 0',
        borderBottom: '1px solid #ccc',
        padding: '4px 0 12px',
    },
    groupHeader: {
        marginBottom: '8px',
    },
    displayName: {
        color: 'rgba(0, 0, 0, 0.6)',
        fontSize: '14px',
    },
    fieldLabel: {
        color: 'rgba(0, 0, 0, 0.5)',
        fontSize: '11px',
    },
    deleteIcon: {
        textDecoration: 'none',
        height: '20px',
        width: '24px',
        color: '#DB1C34',
        fontFamily: 'material',
        fontSize: '20px',
        lineHeight: '32px',
        margin: '0 0 0 -12px',
    },
    errorLabel: {
        margin: '8px 0 0',
        color: '#EB5757',
    },
};
