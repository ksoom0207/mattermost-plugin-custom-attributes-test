import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getProfilesByIds} from 'mattermost-redux/actions/users';
import {getTeam} from 'mattermost-redux/actions/teams';

import GroupMention from './group_mention.jsx';

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getProfilesByIds,
            getTeam,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(GroupMention);
