package main

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"sync"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

type Plugin struct {
	plugin.MattermostPlugin

	// configuration is the active plugin configuration. Consult getConfiguration and
	// setConfiguration for usage.
	configuration *configuration

	// configurationLock synchronizes access to the configuration.
	configurationLock sync.RWMutex
}

func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	if userID == "" {
		http.Error(w, "Not authorized", http.StatusUnauthorized)
		return
	}

	switch path := r.URL.Path; path {
	case "/api/v1/attributes":
		p.handleGetAttributes(w, r)
		return
	case "/api/v1/group-mentions":
		p.handleGetGroupMentions(w, r)
		return
	case "/api/v1/group-mentions/members":
		p.handleGetGroupMembers(w, r)
		return
	default:
		http.NotFound(w, r)
	}
}

func (p *Plugin) handleGetAttributes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.NotFound(w, r)
		return
	}

	config := p.getConfiguration()
	if !config.IsValid() {
		http.Error(w, "Not configured", http.StatusNotImplemented)
		return
	}

	userID := r.URL.Query().Get("user_id")

	if userID == "" {
		http.Error(w, "Missing user_id", http.StatusBadRequest)
		return
	}

	attributes := []string{}
	usersTeams, _ := p.API.GetTeamsForUser(userID)
	usersGroups, _ := p.API.GetGroupsForUser(userID)
	for _, ca := range config.CustomAttributes {
		if ca.UserIDs == nil && ca.TeamIDs == nil && ca.GroupIDs == nil {
			continue
		}
		if sliceContainsString(ca.UserIDs, userID) || sliceContainsUserTeam(ca.TeamIDs, usersTeams) || sliceContainsUserGroup(ca.GroupIDs, usersGroups) {
			attributes = append(attributes, ca.Name)
		}
	}

	b, jsonErr := json.Marshal(attributes)
	if jsonErr != nil {
		http.Error(w, "Error encoding json", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_, err := w.Write(b)
	if err != nil {
		p.API.LogError("failed to write http response", err.Error())
	}
}

func sliceContainsString(arr []string, str string) bool {
	for _, a := range arr {
		if a == str {
			return true
		}
	}
	return false
}

func sliceContainsUserTeam(arr []string, userTeams []*model.Team) bool {
	for _, a := range arr {
		for _, userTeam := range userTeams {
			if a == userTeam.Id {
				return true
			}
		}
	}
	return false
}

func sliceContainsUserGroup(arr []string, userGroups []*model.Group) bool {
	for _, a := range arr {
		for _, userGroup := range userGroups {
			if a == userGroup.Id {
				return true
			}
		}
	}
	return false
}

// MessageWillBePosted is invoked when a message is posted by a user before it is committed to the database.
func (p *Plugin) MessageWillBePosted(c *plugin.Context, post *model.Post) (*model.Post, string) {
	config := p.getConfiguration()
	if config.GroupMentions == nil || len(config.GroupMentions) == 0 {
		return post, ""
	}

	// Find all @mentions in the message
	mentionPattern := regexp.MustCompile(`@([a-zA-Z0-9\-_]+)`)
	matches := mentionPattern.FindAllStringSubmatch(post.Message, -1)

	if len(matches) == 0 {
		return post, ""
	}

	// Collect all user IDs that should be notified
	usersToNotify := make(map[string]bool)

	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		mentionName := match[1]

		// Check if this mention matches any group mention
		for _, gm := range config.GroupMentions {
			if strings.EqualFold(gm.Name, mentionName) {
				// Add all users from this group
				userIDs := p.getGroupMemberIDs(&gm)
				for _, userID := range userIDs {
					usersToNotify[userID] = true
				}
				break
			}
		}
	}

	// Add the user IDs to the post's mentions
	if len(usersToNotify) > 0 {
		// Initialize Props if nil
		if post.Props == nil {
			post.Props = make(model.StringInterface)
		}

		// Get existing mentions if any
		existingMentions := []string{}
		if mentions, ok := post.Props["mentions"].(string); ok {
			existingMentions = strings.Split(mentions, ",")
		}

		// Add new mentions
		for userID := range usersToNotify {
			existingMentions = append(existingMentions, userID)
		}

		// Store back in props
		post.Props["mentions"] = strings.Join(existingMentions, ",")
		post.AddProp("mentionHighlightDisabled", false)
	}

	return post, ""
}

// getGroupMemberIDs returns all user IDs that belong to a group mention
func (p *Plugin) getGroupMemberIDs(gm *GroupMention) []string {
	userIDs := make(map[string]bool)

	// Add individual users
	for _, userID := range gm.UserIDs {
		userIDs[userID] = true
	}

	// Add users from teams
	for _, teamID := range gm.TeamIDs {
		teamMembers, err := p.API.GetTeamMembers(teamID, 0, 10000)
		if err != nil {
			p.API.LogError("Failed to get team members", "team_id", teamID, "error", err.Error())
			continue
		}
		for _, member := range teamMembers {
			userIDs[member.UserId] = true
		}
	}

	// Add users from groups
	for _, groupID := range gm.GroupIDs {
		group, err := p.API.GetGroup(groupID)
		if err != nil {
			p.API.LogError("Failed to get group", "group_id", groupID, "error", err.Error())
			continue
		}
		if group != nil {
			// Get group members - Note: This requires accessing group members differently
			// For now, we'll skip automatic group member resolution for LDAP groups
			// Users can add individual user IDs or team IDs instead
			p.API.LogWarn("Group ID specified but automatic member resolution not fully implemented", "group_id", groupID)
		}
	}

	// Convert map to slice
	result := make([]string, 0, len(userIDs))
	for userID := range userIDs {
		result = append(result, userID)
	}

	return result
}

// handleGetGroupMentions returns all configured group mentions
func (p *Plugin) handleGetGroupMentions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	config := p.getConfiguration()
	if config.GroupMentions == nil {
		config.GroupMentions = []GroupMention{}
	}

	b, jsonErr := json.Marshal(config.GroupMentions)
	if jsonErr != nil {
		http.Error(w, "Error encoding json", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_, err := w.Write(b)
	if err != nil {
		p.API.LogError("failed to write http response", err.Error())
	}
}

// GroupMemberResponse represents the response for group members
type GroupMemberResponse struct {
	GroupName string              `json:"group_name"`
	Members   []*model.User       `json:"members"`
	Count     int                 `json:"count"`
}

// handleGetGroupMembers returns all members of a specific group mention
func (p *Plugin) handleGetGroupMembers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	groupName := r.URL.Query().Get("name")
	if groupName == "" {
		http.Error(w, "Missing group name", http.StatusBadRequest)
		return
	}

	config := p.getConfiguration()
	var targetGroup *GroupMention
	for _, gm := range config.GroupMentions {
		if strings.EqualFold(gm.Name, groupName) {
			targetGroup = &gm
			break
		}
	}

	if targetGroup == nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	// Get all user IDs
	userIDs := p.getGroupMemberIDs(targetGroup)

	// Fetch user details
	users := make([]*model.User, 0, len(userIDs))
	for _, userID := range userIDs {
		user, err := p.API.GetUser(userID)
		if err != nil {
			p.API.LogError("Failed to get user", "user_id", userID, "error", err.Error())
			continue
		}
		users = append(users, user)
	}

	response := GroupMemberResponse{
		GroupName: targetGroup.DisplayName,
		Members:   users,
		Count:     len(users),
	}

	b, jsonErr := json.Marshal(response)
	if jsonErr != nil {
		http.Error(w, "Error encoding json", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_, err := w.Write(b)
	if err != nil {
		p.API.LogError("failed to write http response", err.Error())
	}
}
