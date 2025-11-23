// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';

import ConfirmModal from '../widgets/confirmation_modal.tsx';

import AddGroupMention from './add_group_mention.jsx';
import GroupMention from './group_mention';

export default class GroupMentionSettings extends React.Component {
    static propTypes = {
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        helpText: PropTypes.node,
        value: PropTypes.any,
        disabled: PropTypes.bool.isRequired,
        config: PropTypes.object.isRequired,
        currentState: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired,
        setByEnv: PropTypes.bool.isRequired,
        onChange: PropTypes.func.isRequired,
        registerSaveAction: PropTypes.func.isRequired,
        setSaveNeeded: PropTypes.func.isRequired,
        unRegisterSaveAction: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            groupMentions: this.initGroupMentions(props.value),
            showDeleteModal: false,
            deleteModalData: {},
        };
    }

    initGroupMentions(groupMentions) {
        if (!groupMentions) {
            return new Map();
        }

        // Store the group mentions in a map indexed by position
        return new Map(groupMentions.map((gm, index) => [index, gm]));
    }

    getGroupMentionsList() {
        if (this.state.groupMentions.size === 0) {
            return (
                <div style={styles.alertDiv}>
                    <div style={styles.alertText}>{'You have no group mentions yet.'}</div>
                </div>
            );
        }

        return Array.from(this.state.groupMentions, ([key, value]) => {
            return (
                <GroupMention
                    key={key}
                    id={key}
                    name={value.Name}
                    displayName={value.DisplayName}
                    users={value.UserIDs}
                    teams={value.TeamIDs}
                    groups={value.GroupIDs ? value.GroupIDs.join(' ') : ''}
                    onChange={this.handleChange}
                    onDelete={this.triggerDeleteModal}
                />
            );
        });
    }

    triggerDeleteModal = (id) => {
        const groupMention = Array.from(this.state.groupMentions.values())[id];
        this.setState({
            showDeleteModal: true,
            deleteModalData: {
                id,
                Name: groupMention.Name,
                DisplayName: groupMention.DisplayName,
            },
        });
    };

    handleDelete = (id) => {
        this.state.groupMentions.delete(id);
        this.props.onChange(this.props.id, Array.from(this.state.groupMentions.values()));
        this.props.setSaveNeeded();
        this.setState({showDeleteModal: false});
    };

    handleChange = ({id, name, displayName, users, teams, groups}) => {
        let userIds = [];
        if (users) {
            userIds = users.map((v) => {
                if (v.id) {
                    return v.id;
                }
                return v;
            });
        }

        let teamIds = [];
        if (teams) {
            teamIds = teams.map((team) => {
                if (team.id) {
                    return team.id;
                }
                return team;
            });
        }

        this.state.groupMentions.set(id, {
            Name: name,
            DisplayName: displayName,
            UserIDs: userIds,
            TeamIDs: teamIds,
            GroupIDs: groups ? groups.split(' ') : [],
        });

        this.props.onChange(this.props.id, Array.from(this.state.groupMentions.values()));
        this.props.setSaveNeeded();
    };

    render() {
        return (
            <div>
                <strong>{'Group Mentions'}</strong>
                <div style={styles.helpText}>
                    {'Configure group mentions to notify multiple users at once using @groupname. Only system administrators can manage group mentions.'}
                </div>
                <div>
                    {this.getGroupMentionsList()}
                    <AddGroupMention
                        onChange={this.handleChange}
                        id={this.state.groupMentions.size}
                    />
                </div>
                <ConfirmModal
                    show={this.state.showDeleteModal}
                    title={'Delete Group Mention'}
                    message={
                        'Are you sure you want to remove the group mention: "@' +
                        this.state.deleteModalData.Name + '" (' +
                        this.state.deleteModalData.DisplayName + ')?'
                    }
                    confirmButtonText={'Remove Group Mention'}
                    onConfirm={() => {
                        this.handleDelete(this.state.deleteModalData.id);
                    }}
                    onCancel={() => this.setState({showDeleteModal: false})}
                />
            </div>
        );
    }
}

const styles = {
    alertDiv: {
        borderRadius: '4px',
        backgroundColor: 'rgba(0, 0, 0, .04)',
        padding: '12px',
        margin: '8px 0',
    },
    alertText: {
        opacity: '0.6',
    },
    helpText: {
        fontSize: '13px',
        color: 'rgba(0, 0, 0, 0.6)',
        marginBottom: '10px',
    },
};
