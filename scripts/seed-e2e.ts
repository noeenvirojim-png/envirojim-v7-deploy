import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";
import fs from "fs";
import path from "path";

async function run() {
  const s = createAdminClient();
  
  console.log("Seeding context...");
  
  // 1. Storage check/upload
  const filePath = path.join(__dirname, "valid-test.pdf");
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    await s.storage.from("machine-documents").upload("test/test-seed.pdf", fileBuffer, {
      contentType: "application/pdf",
      upsert: true
    });
    console.log("PDF uploaded to storage.");
  }

  // 1. ORG
  const { data: org, error: orgError } = await s.from("organizations").insert({
    name: "E2E Test Org",
    type: "CLIENT"
  }).select("id").single();
  
  if (orgError) throw orgError;
  console.log("Org created:", org.id);

  // 2. USER
  const email = "e2e@test.com";
  let userId;
  
  const { data: existingUser } = await s.from("users").select("id").eq("email", email).maybeSingle();
  if (existingUser) {
      userId = existingUser.id;
  } else {
      const { data: authUser, error: authError } = await s.auth.admin.createUser({
          email,
          password: "password123",
          email_confirm: true
      });
      
      let authId;
      if (authError) {
          const { data: { users } } = await s.auth.admin.listUsers();
          const target = users.find(u => u.email === email);
          authId = target.id;
      } else {
          authId = authUser.user.id;
      }
      
      const { data: newUser } = await s.from("users").insert({
          id: authId,
          organization_id: org.id,
          email,
          role: "client_user"
      }).select("id").single();
      userId = newUser.id;
  }
  console.log("User active:", userId);

  // 3. MACHINE
  const { data: machine, error: macError } = await s.from("machines").insert({
    organization_id: org.id,
    serial_number: "E2E-SERIAL-500",
    model: "Titan 500",
    status_internal: "active"
  }).select("id").single();
  
  if (macError) throw macError;
  console.log("Machine created:", machine.id);

  // 4. DOCUMENT
  const { data: doc, error: docError } = await s.from("machine_documents").insert({
    machine_id: machine.id,
    organization_id: org.id, // CRITICAL FIX
    filename: "test-seed.pdf",
    storage_path: "test/test-seed.pdf",
    document_type: "manual",
    processing_status: "uploaded"
  }).select("id").single();
  
  if (docError) throw docError;
  console.log("Document created:", doc.id);
  
  console.log("SEED_COMPLETE");
}

run().catch(console.error);
