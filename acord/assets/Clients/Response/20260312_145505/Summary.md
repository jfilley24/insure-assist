# Reviewer Output:
{
  "passed": false,
  "gaps": [
    "General Liability policy is expired (Expiration Date: 09/29/2024).",
    "General Liability Each Occurrence limit of $1,000,000 is less than the demanded $2,000,000.",
    "Auto Liability policy is expired (Expiration Date: 09/29/2024).",
    "Auto Liability Combined Single Limit of $1,000,000 is less than the demanded $2,000,000.",
    "Umbrella Liability policy is expired (Expiration Date: 09/29/2025).",
    "Workers Compensation policy is expired (Expiration Date: 09/29/2024).",
    "Workers Compensation Waiver of Subrogation is required but not present in the policy."
  ],
  "policy_reviews": [
    {
      "policy_type": "General Liability",
      "status": "FAILED",
      "comments": [
        "Policy is expired. Expiration Date: 09/29/2024. Today's Date: 2026-03-12.",
        "Each Occurrence limit of $1,000,000 is less than the demanded $2,000,000."
      ]
    },
    {
      "policy_type": "Auto Liability",
      "status": "FAILED",
      "comments": [
        "Policy is expired. Expiration Date: 09/29/2024. Today's Date: 2026-03-12.",
        "Combined Single Limit of $1,000,000 is less than the demanded $2,000,000."
      ]
    },
    {
      "policy_type": "Umbrella Liability",
      "status": "FAILED",
      "comments": [
        "Policy is expired. Expiration Date: 09/29/2025. Today's Date: 2026-03-12."
      ]
    },
    {
      "policy_type": "Workers Compensation",
      "status": "FAILED",
      "comments": [
        "Policy is expired. Expiration Date: 09/29/2024. Today's Date: 2026-03-12.",
        "Waiver of Subrogation is required but not present in the policy."
      ]
    }
  ]
}