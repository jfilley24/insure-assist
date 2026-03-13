import * as dotenv from 'dotenv';
dotenv.config();

async function testManualCOI() {
  const formData = new FormData();
  formData.append("certificate_holder_name", "Test Holder");
  formData.append("description_of_operations", "Test Description Operations here");
  
  const policies = {
    auto: { policy_number: "AUTO123", combined_single_limit: "1000000", insurer_name: "State Farm" },
    gl: { policy_number: "GL123", each_occurrence: "2000000", insurer_name: "GEICO" }
  };
  formData.append("policies_json", JSON.stringify(policies));
  
  const settings = {
    managedAuto: true,
    managedGL: true,
    clientName: "Test Client Inc",
    brokerName: "Test Broker LLC"
  };
  formData.append("client_settings_json", JSON.stringify(settings));

  console.log("Sending manual request to FastAPI...");
  
  try {
    const response = await fetch("http://127.0.0.1:8000/generate-coi-manual", {
      method: "POST",
      body: formData as any
    });
    
    if (!response.ok) {
      console.error("Failed:", await response.text());
      return;
    }
    
    console.log("Success! Now let's extract the PDF directly to check its fields...");
    const data = await response.json();
    
    const fs = require('fs');
    fs.writeFileSync('manual_test.pdf', Buffer.from(data.pdf_base64, 'base64'));
    console.log("Saved manual_test.pdf");
    
  } catch (err) {
    console.error(err);
  }
}

testManualCOI();
