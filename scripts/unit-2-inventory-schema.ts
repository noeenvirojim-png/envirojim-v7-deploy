import { MachineInventorySchema } from "../src/lib/machines/intelligence/schemas/machineInventory.schema";

function testInventorySchema() {
  console.log("UNIT TEST 2: INVENTORY SCHEMA");

  const validCase = {
    document_type: "manual",
    manufacturer: "Envirojim",
    model: "VB750",
    systems: ["Engine", "Hydraulics"],
    language: "fr",
    summary: "Complete manual for VB750"
  };

  const invalidCase = {
    document_type: "manual"
    // missing mandatory fields
  };

  try {
    MachineInventorySchema.parse(validCase);
    console.log("PASS: Valid case parsed correctly.");
  } catch (err: any) {
    console.log("FAIL: Valid case failed parsing.");
    process.exit(1);
  }

  try {
    MachineInventorySchema.parse(invalidCase);
    console.log("FAIL: Invalid case should have failed parsing.");
    process.exit(1);
  } catch (err: any) {
    console.log("PASS: Invalid case failed as expected.");
  }

  console.log("UNIT TEST 2 STATUS: PASS");
}

testInventorySchema();
