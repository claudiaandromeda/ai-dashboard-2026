#!/bin/bash

# Ensure jq is installed for JSON parsing
if ! command -v jq &> /dev/null
then
    echo "Error: jq is not installed. Please install it using 'brew install jq' (macOS) or 'sudo apt-get install jq' (Linux)."
    exit 1
fi

# Load API key from .env
NOTION_API_KEY=$(grep NOTION_API_KEY ~/.openclaw/.env | cut -d '=' -f2)
if [ -z "$NOTION_API_KEY" ]; then
    echo "Error: NOTION_API_KEY not found in ~/.openclaw/.env. Please ensure it's set correctly."
    exit 1
fi

NOTION_VERSION="2022-06-28"
DATABASE_ID="316c36dd-a70f-811f-974b-ccda9d2ddb29" # Your Notion Task Board ID

echo "Starting Notion Task Poller at $(date)"

# Query for tasks assigned to 'Claudia' with 'To Do' status
# IMPORTANT: You need to replace "claudia_user_id_placeholder" with Claudia's actual Notion User ID.
# If 'Assignee' is a text property, change the filter to:
# { "property": "Assignee", "text": { "equals": "Claudia" } }
# You can find Claudia's Notion User ID by inspecting a page or querying the Notion API for users.
response=$(curl -s -X POST "https://api.notion.com/v1/databases/${DATABASE_ID}/query" \
  -H "Authorization: Bearer ${NOTION_API_KEY}" \
  -H "Notion-Version: ${NOTION_VERSION}" \
  -H "Content-Type: application/json" \
  --data '{
      "filter": {
          "and": [
              {
                  "property": "Status",
                  "select": {
                      "equals": "To Do"
                  }
              },
              {
                  "property": "Assignee",
                  "people": {
                      "contains": "claudia_user_id_placeholder"
                  }
              }
          ]
      }
  }')

# Check for API errors
if echo "$response" | grep -q "code"; then
    echo "Error querying Notion API: $response"
    exit 1
fi

task_pages=$(echo "$response" | jq -c '.results[]')

if [ -z "$task_pages" ]; then
    echo "No 'To Do' tasks found for Claudia. Exiting silently."
    exit 0
fi

echo "$task_pages" | while read -r page; do
    page_id=$(echo "$page" | jq -r '.id')
    task_title=$(echo "$page" | jq -r '.properties.Name.title[0].plain_text')
    
    # Attempt to get assignee name from a 'people' property. Adjust if your 'Assignee' is a text property.
    assignee_array=$(echo "$page" | jq -r '.properties.Assignee.people')
    assignee_name="Unknown"
    if [ "$assignee_array" != "null" ] && [ "$(echo "$assignee_array" | jq length)" -gt 0 ]; then
        assignee_name=$(echo "$assignee_array" | jq -r '.[0].name')
    fi


    if [ "$assignee_name" == "Elliot" ]; then
        echo "Skipping task '$task_title' (ID: $page_id) assigned to Elliot."
        continue
    fi

    echo "Processing task: '$task_title' (ID: $page_id)"

    # 1) Update status to 'In Progress'
    update_response_progress=$(curl -s -X PATCH "https://api.notion.com/v1/pages/${page_id}" \
      -H "Authorization: Bearer ${NOTION_API_KEY}" \
      -H "Notion-Version: ${NOTION_VERSION}" \
      -H "Content-Type: application/json" \
      --data '{
          "properties": {
              "Status": {
                  "select": {
                      "name": "In Progress"
                  }
              }
          }
      }')

    if echo "$update_response_progress" | grep -q "code"; then
        echo "Error updating task '$task_title' to 'In Progress': $update_response_progress"
        continue
    fi
    echo "Task '$task_title' updated to 'In Progress'."

    # 2) Execute the task
    echo "Simulating execution for task: '$task_title'..."
    # IMPORTANT: This section needs to be replaced with actual logic to "execute" the task.
    # This might involve calling other scripts, tools, or agent actions based on the task title and notes.
    sleep 5 # Simulate work for 5 seconds
    echo "Task '$task_title' execution simulated."

    # 3) Update status to 'Done' and add completion note
    completion_note="Task completed by Claudia at $(date)."
    update_response_done=$(curl -s -X PATCH "https://api.notion.com/v1/pages/${page_id}" \
      -H "Authorization: Bearer ${NOTION_API_KEY}" \
      -H "Notion-Version: ${NOTION_VERSION}" \
      -H "Content-Type: application/json" \
      --data '{
          "properties": {
              "Status": {
                  "select": {
                      "name": "Done"
                  }
              }
          }
      }')

    if echo "$update_response_done" | grep -q "code"; then
        echo "Error updating task '$task_title' to 'Done': $update_response_done"
        continue
    fi
    echo "Task '$task_title' marked as 'Done'."

    # Add completion note as a block to the page
    block_response=$(curl -s -X PATCH "https://api.notion.com/v1/blocks/${page_id}/children" \
      -H "Authorization: Bearer ${NOTION_API_KEY}" \
      -H "Notion-Version: ${NOTION_VERSION}" \
      -H "Content-Type: application/json" \
      --data '{
          "children": [
              {
                  "object": "block",
                  "type": "paragraph",
                  "paragraph": {
                      "rich_text": [
                          {
                              "text": {
                                  "content": "Completion Note: '"$completion_note"'"
                              }
                          }
                      ]
                  }
              }
          ]
      }')

    if echo "$block_response" | grep -q "code"; then
        echo "Error adding completion note to task '$task_title': $block_response"
    else
        echo "Completion note added to task '$task_title'."
    fi

done
echo "Notion Task Poller finished at $(date)"