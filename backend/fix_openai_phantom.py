"""Fix OpenAI phantom connection in Atlas"""
import pymongo

ATLAS_URI = "mongodb+srv://restinai:eGYK4wDzrOSxMHkz@cluster0.5ndlsdd.mongodb.net/restin_v2?retryWrites=true&w=majority&appName=Cluster0"
client = pymongo.MongoClient(ATLAS_URI)
db = client["restin_v2"]

result = db.integration_configs.update_one(
    {"provider": "OPENAI"},
    {"$set": {"isEnabled": False, "status": "NOT_CONFIGURED", "credentials": {"api_key": ""}}}
)
print(f"OpenAI fix: matched={result.matched_count}, modified={result.modified_count}")

# Verify
doc = db.integration_configs.find_one({"provider": "OPENAI"}, {"_id": 0, "credentials": 0})
print(f"Current state: {doc}")

client.close()
print("Done!")
