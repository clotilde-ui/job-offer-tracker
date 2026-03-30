#!/bin/bash
# Test d'envoi d'un lead vers une campagne Emelia Advanced
# Usage: bash scripts/test-emelia-advanced.sh

API_KEY="4lv9dTrwKfjhAK8eSGWwxgRF6e2lU0ihiBE7rjLBIMz2RDGH"
CAMPAIGN_ID="69c692b0416bc5b4dcac8c17"

echo "=== Test 1 : Vérification visibilité campagne ==="
curl -s -X GET "https://api.emelia.io/advanced/campaigns" \
  -H "Authorization: $API_KEY" | python3 -m json.tool
echo ""

echo "=== Test 2 : Envoi d'un lead test (avec email) ==="
curl -s -X POST "https://api.emelia.io/advanced/campaign/add-contact" \
  -H "Content-Type: application/json" \
  -H "Authorization: $API_KEY" \
  -d '{
    "campaignId": "'"$CAMPAIGN_ID"'",
    "contact": {
      "email": "test.claude@example.com",
      "firstName": "Test",
      "lastName": "Claude",
      "linkedinUrl": "https://www.linkedin.com/in/test-claude",
      "customFields": {
        "Entreprise": "Société Test",
        "Civilite": "M.",
        "Posteclean": "Développeur"
      }
    }
  }' | python3 -m json.tool
echo ""

echo "=== Test 3 : Envoi d'un lead test (SANS email) ==="
curl -s -X POST "https://api.emelia.io/advanced/campaign/add-contact" \
  -H "Content-Type: application/json" \
  -H "Authorization: $API_KEY" \
  -d '{
    "campaignId": "'"$CAMPAIGN_ID"'",
    "contact": {
      "firstName": "Test",
      "lastName": "SansEmail",
      "linkedinUrl": "https://www.linkedin.com/in/test-sans-email",
      "customFields": {
        "Entreprise": "Société Test",
        "Civilite": "Mme",
        "Posteclean": "Directrice"
      }
    }
  }' | python3 -m json.tool
echo ""
