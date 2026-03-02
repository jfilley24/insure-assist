import logging
from typing import Annotated
from livekit.agents import llm

logger = logging.getLogger("agent-tools")
logger.setLevel(logging.INFO)

# A collection of tools that allow the Omni-Agent to execute 
# actions simulating a heavily-integrated insurance backend system.

@llm.function_tool(description="Look up a client's outstanding billing balance using their phone number.")
async def lookup_billing_balance() -> str:
        logger.info("[MOCK API CALL]: Executing billing database lookup.")
        # Simulating external database fetch
        return "The client has an outstanding balance of $124.50, due in 3 days."

@llm.function_tool(description="Text a secure one-time payment URL to the client's mobile phone so they can pay their bill. You MUST say this out-loud to them.")
async def send_secure_payment_link() -> str:
        logger.info("[MOCK API CALL]: Firing SMS Webhook with Square payment link.")
        return "Success! Alert the client you just sent the secure payment link to their mobile number."

@llm.function_tool(description="Intake a First Notice of Loss (FNOL) emergency claim.")
async def log_fnol_claim(
    incident_type: Annotated[str, "What type of incident occurred (e.g., auto accident, house fire)"],
    incident_date: Annotated[str, "When it happened"],
    incident_location: Annotated[str, "Where it happened"]
) -> str:
        logger.info(f"[MOCK API CALL]: Logging FNOL Claim -> Type: {incident_type}, Date: {incident_date}, Location: {incident_location}")
        return "Claim successfully logged in the system. Alert Jason Filley."

@llm.function_tool(description="Email or text the client their active Auto ID cards.")
async def retrieve_auto_id_cards(
    delivery_method: Annotated[str, "How to deliver the cards (email or text)"]
) -> str:
        logger.info(f"[MOCK API CALL]: Generating Auto ID PDFs and sending via {delivery_method}.")
        return f"Successfully generated ID cards and sent them via {delivery_method}."

@llm.function_tool(description="Generate and email a Certificate of Insurance (COI) to a contractor.")
async def generate_and_send_coi(
    certificate_holder_name: Annotated[str, "The name of the entity requesting the document."]
) -> str:
        logger.info(f"[MOCK API CALL]: Generating ACORD 25 for holder: {certificate_holder_name}")
        return f"Successfully emailed the COI to the certificate holder: {certificate_holder_name}"

@llm.function_tool(description="Submit a vehicle endorsement to add a new car to a policy.")
async def submit_vehicle_endorsement(
    vehicle_year: Annotated[str, "The year of the vehicle"],
    vehicle_make: Annotated[str, "The make of the vehicle"],
    vehicle_model: Annotated[str, "The model of the vehicle"]
) -> str:
        logger.info(f"[MOCK API CALL]: Firing endorsement queue for {vehicle_year} {vehicle_make} {vehicle_model}")
        return "Endorsement ticket created for an underwriter to process."

@llm.function_tool(description="Alert the on-call agent if a client is calling after hours with a severe emergency.")
async def page_on_call_agent() -> str:
    logger.info("[MOCK API CALL]: Triggering PagerDuty alert for Jason Filley!")
    return "Successfully paged Jason Filley. Tell the client to wait for a call back immediately."
