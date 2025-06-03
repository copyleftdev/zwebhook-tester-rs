#!/bin/bash
#
# ZWebHook-Tester Load Testing Script
# This script uses GNU parallel to send diverse payloads to the webhook tester
# 
# Usage: ./test-webhooks.sh [host] [count]
#   host: Target host (default: localhost:8080)
#   count: Number of webhooks to send (default: 50)

set -e

# Default parameters
HOST=${1:-"localhost:8080"}
COUNT=${2:-50}
PARALLEL_JOBS=10

echo "🚀 ZWebHook-Tester Load Testing"
echo "Target: $HOST"
echo "Total webhooks: $COUNT"
echo "Parallel jobs: $PARALLEL_JOBS"

# Check if GNU parallel is installed
if ! command -v parallel &> /dev/null; then
    echo "Error: GNU parallel is not installed."
    echo "Install with: sudo apt-get install parallel"
    exit 1
fi

# Helper function to get a random number in range (1-max inclusive)
random_range() {
    local max=$1
    echo $(( (RANDOM % max) + 1 ))
}

# Get a random endpoint
get_random_endpoint() {
    local num=$(random_range 8)
    case $num in
        1) echo "/api/webhook" ;;
        2) echo "/webhook" ;;
        3) echo "/events" ;;
        4) echo "/notifications" ;;
        5) echo "/callbacks/payment" ;;
        6) echo "/stripe/events" ;;
        7) echo "/github/push" ;;
        8) echo "/api/v1/events" ;;
    esac
}

# Get a random HTTP method
get_random_method() {
    local num=$(random_range 5)
    case $num in
        1) echo "POST" ;;
        2) echo "PUT" ;;
        3) echo "PATCH" ;;
        4) echo "DELETE" ;;
        5) echo "GET" ;;
    esac
}

# Get a random content type
get_random_content_type() {
    local num=$(random_range 4)
    case $num in
        1) echo "application/json" ;;
        2) echo "application/xml" ;;
        3) echo "text/plain" ;;
        4) echo "application/x-www-form-urlencoded" ;;
    esac
}

# Get a random event type
get_random_event_type() {
    local num=$(random_range 8)
    case $num in
        1) echo "purchase" ;;
        2) echo "signup" ;;
        3) echo "login" ;;
        4) echo "logout" ;;
        5) echo "payment" ;;
        6) echo "refund" ;;
        7) echo "shipping" ;;
        8) echo "delivery" ;;
    esac
}

# Generate a random JSON payload
generate_json_payload() {
    local event_type=$(get_random_event_type)
    local user_id=$((1000 + RANDOM % 9000))
    local timestamp=$(date -Iseconds)
    local amount=$((RANDOM % 1000 + 1))
    local ip1=$((RANDOM % 254 + 1))
    local ip2=$((RANDOM % 254 + 1))
    local price1=$((RANDOM % 100 + 1))
    local price2=$((RANDOM % 100 + 1))
    local value1=$((RANDOM % 1000 + 1))
    local value2=$((RANDOM % 1000 + 1))
    local deep_value=$((RANDOM % 1000 + 1))
    
    cat <<EOF
{
  "event_type": "$event_type",
  "user_id": "$user_id",
  "timestamp": "$timestamp",
  "metadata": {
    "ip_address": "192.168.$ip1.$ip2",
    "user_agent": "Mozilla/5.0 (Test Script)",
    "session_id": "sess_${RANDOM}${RANDOM}"
  },
  "data": {
    "amount": $amount,
    "currency": "USD",
    "items": [
      {
        "id": "item_${RANDOM}",
        "name": "Product $((RANDOM % 99 + 1))",
        "price": $price1
      },
      {
        "id": "item_${RANDOM}",
        "name": "Product $((RANDOM % 99 + 1))",
        "price": $price2
      }
    ],
    "nested": {
      "value1": "$value1",
      "value2": "$value2",
      "deep": {
        "deeper": {
          "deepest": "value_$deep_value"
        }
      }
    }
  }
}
EOF
}

# Generate an XML payload
generate_xml_payload() {
    local event_type=$(get_random_event_type)
    local user_id=$((1000 + RANDOM % 9000))
    local timestamp=$(date -Iseconds)
    local ip1=$((RANDOM % 254 + 1))
    local ip2=$((RANDOM % 254 + 1))
    local amount=$((RANDOM % 1000 + 1))
    local price1=$((RANDOM % 100 + 1))
    local price2=$((RANDOM % 100 + 1))
    
    cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<webhook>
  <event_type>$event_type</event_type>
  <user_id>$user_id</user_id>
  <timestamp>$timestamp</timestamp>
  <metadata>
    <ip_address>192.168.$ip1.$ip2</ip_address>
    <user_agent>Mozilla/5.0 (Test Script)</user_agent>
    <session_id>sess_${RANDOM}${RANDOM}</session_id>
  </metadata>
  <data>
    <amount>$amount</amount>
    <currency>USD</currency>
    <items>
      <item>
        <id>item_${RANDOM}</id>
        <name>Product $((RANDOM % 99 + 1))</name>
        <price>$price1</price>
      </item>
      <item>
        <id>item_${RANDOM}</id>
        <name>Product $((RANDOM % 99 + 1))</name>
        <price>$price2</price>
      </item>
    </items>
  </data>
</webhook>
EOF
}

# Generate a form-urlencoded payload
generate_form_payload() {
    local event_type=$(get_random_event_type)
    local user_id=$((1000 + RANDOM % 9000))
    local amount=$((RANDOM % 1000 + 1))
    
    echo "event_type=$event_type&user_id=$user_id&amount=$amount&currency=USD&timestamp=$(date -Iseconds)"
}

# Generate a plain text payload
generate_text_payload() {
    local event_type=$(get_random_event_type)
    local user_id=$((1000 + RANDOM % 9000))
    local dollars=$((RANDOM % 1000 + 1))
    local cents=$((RANDOM % 99 + 1))
    
    cat <<EOF
Event: $event_type
User: user_$user_id
Time: $(date)
Amount: \$$dollars.$cents
Reference: REF_${RANDOM}${RANDOM}
EOF
}

# Function to send a webhook
send_webhook() {
    local index=$1
    local endpoint=$(get_random_endpoint)
    local method=$(get_random_method)
    local content_type=$(get_random_content_type)
    local payload=""
    
    # Generate payload based on content type
    case "$content_type" in
        "application/json")
            payload=$(generate_json_payload)
            ;;
        "application/xml")
            payload=$(generate_xml_payload)
            ;;
        "text/plain")
            payload=$(generate_text_payload)
            ;;
        "application/x-www-form-urlencoded")
            payload=$(generate_form_payload)
            ;;
    esac
    
    # Build header arguments for curl
    local headers="-H \"Content-Type: $content_type\" -H \"X-Request-ID: req_${RANDOM}${RANDOM}\" -H \"X-Test-Number: $index\""
    
    # Randomly add extra headers
    if [ $((RANDOM % 2)) -eq 0 ]; then
        headers="$headers -H \"User-Agent: ZWebHook-Tester Script v1.0\""
    fi
    
    if [ $((RANDOM % 2)) -eq 0 ]; then
        headers="$headers -H \"X-Source-System: test-script\""
    fi
    
    if [ $((RANDOM % 2)) -eq 0 ]; then
        headers="$headers -H \"X-Correlation-ID: corr_${RANDOM}${RANDOM}\""
    fi
    
    # For GET and DELETE methods, don't send a payload
    if [[ "$method" == "GET" || "$method" == "DELETE" ]]; then
        eval curl -s -X "$method" $headers "http://$HOST$endpoint?test=$index" > /dev/null
    else
        eval curl -s -X "$method" $headers -d "'$payload'" "http://$HOST$endpoint" > /dev/null
    fi
    
    echo "[$index] Sent $method request to $endpoint (Content-Type: $content_type)"
}

export -f send_webhook
export -f random_range
export -f get_random_endpoint
export -f get_random_method
export -f get_random_content_type
export -f get_random_event_type
export -f generate_json_payload
export -f generate_xml_payload
export -f generate_form_payload
export -f generate_text_payload

echo "Starting load test with $COUNT webhooks..."
seq 1 $COUNT | parallel -j $PARALLEL_JOBS send_webhook

echo "✅ Load test completed!"
echo "Check the ZWebHook-Tester UI to see the captured webhooks"
