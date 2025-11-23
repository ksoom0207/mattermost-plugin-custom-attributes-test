// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';

import GroupMention from './group_mention';

export default class AddGroupMention extends React.Component {
    static propTypes = {
        id: PropTypes.string,
        name: PropTypes.string,
        displayName: PropTypes.string,
        users: PropTypes.array,
        teams: PropTypes.array,
        groups: PropTypes.array,
        onChange: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            collapsed: true,
            name: this.props.name,
            displayName: this.props.displayName,
            users: this.props.users,
            teams: this.props.teams,
            groups: this.props.groups,
            error: false,
        };
    }

    handleCancel = () => {
        this.setState({
            collapsed: true,
            name: null,
            displayName: null,
            users: null,
            teams: null,
            groups: null,
            error: false,
        });
    };

    onInput = ({name, displayName, users, teams, groups}) => {
        this.setState({name, displayName, users, teams, groups, error: false});
    };

    handleSave = () => {
        const usersEmpty = !this.state.users || !this.state.users.length;
        const teamsEmpty = !this.state.teams || !this.state.teams.length;
        const groupsEmpty = !this.state.groups || this.state.groups.trim() === '';

        if (!this.state.name || this.state.name.trim() === '' ||
            !this.state.displayName || this.state.displayName.trim() === '' ||
            (usersEmpty && teamsEmpty && groupsEmpty)) {
            this.setState({error: true});
            return;
        }

        this.props.onChange({
            id: this.props.id,
            name: this.state.name,
            displayName: this.state.displayName,
            users: this.state.users,
            teams: this.state.teams,
            groups: this.state.groups,
        });
        this.setState({
            collapsed: true,
            name: null,
            displayName: null,
            users: null,
            teams: null,
            groups: null,
        });
    };

    render() {
        if (this.state.collapsed) {
            return (
                <div>
                    <a
                        style={styles.addLink}
                        onClick={() => {
                            this.setState({collapsed: false});
                        }}
                    ><strong>{'+ Add Group Mention'}</strong></a>
                </div>
            );
        }

        let errorBanner = null;
        if (this.state.error) {
            errorBanner = (
                <div style={styles.alertDiv}>
                    <p style={styles.alertText}>
                        {'You must provide values for mention name, display name, and at least one user, team, or group.'}
                    </p>
                </div>
            );
        }

        return (
            <div>
                <GroupMention
                    name={this.props.name || ''}
                    displayName={this.props.displayName || ''}
                    users={this.props.users}
                    teams={this.props.teams}
                    groups={this.props.groups}
                    onChange={this.onInput}
                    hideDelete={true}
                />

                <div
                    className='row'
                    style={styles.buttonRow}
                >
                    <div className='col-sm-12'>
                        <button
                            className='btn btn-primary'
                            style={styles.buttonBorder}
                            onClick={this.handleSave}
                        >
                            {'Add Group Mention'}
                        </button>
                        <button
                            className='btn btn-link'
                            onClick={this.handleCancel}
                        >
                            <a style={styles.button}>
                                {'Cancel'}
                            </a>
                        </button>
                    </div>
                </div>
                {errorBanner}
            </div>

        );
    }
}

const styles = {
    buttonRow: {
        marginTop: '8px',
    },
    addLink: {
        cursor: 'pointer',
    },
    alertDiv: {
        borderRadius: '4px',
        backgroundColor: 'rgba(235, 87, 87, 0.1)',
        padding: '12px',
        margin: '8px 0',
    },
    alertText: {
        color: '#EB5757',
        margin: 0,
    },
};
