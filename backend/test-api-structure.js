const axios = require("axios");

async function testAPI() {
  try {
    console.log("Testing login...");
    const loginResponse = await axios.post("http://localhost:3000/api/v1/auth/login", {
      email: "admin@assoftware.xyz",
      password: "password123",
    });
    console.log("Login response keys:", Object.keys(loginResponse.data));
    console.log("Login data keys:", loginResponse.data.data ? Object.keys(loginResponse.data.data) : "N/A");
    
    const token = loginResponse.data?.data?.accessToken || loginResponse.data?.accessToken;
    console.log("Token found:", !!token);
    
    console.log("\nTesting bot-flows creation...");
    const flowResponse = await axios.post(
      "http://localhost:3000/api/v1/bot-flows",
      { name: "Test Flow " + Date.now(), description: "Test", status: "draft" },
      { headers: { Authorization: "Bearer " + token } }
    );
    console.log("Flow response:", JSON.stringify(flowResponse.data, null, 2));
    
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testAPI();