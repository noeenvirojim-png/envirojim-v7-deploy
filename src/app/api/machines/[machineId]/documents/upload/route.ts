import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    const supabase = createClient();
    const machineId = params.machineId;

    // 1. Get User Profile for organization_id
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 403 });
    }

    const organization_id = profile.organization_id;

    // 2. Parse Form Data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const uploadedDocuments = [];

    // 3. Process each file
    for (const file of files) {
      if (file.type !== 'application/pdf') {
        continue; // Only process PDFs
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.pdf`;
      const filePath = `${organization_id}/${machineId}/${fileName}`;

      // Upload to Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('machine-documents')
        .upload(filePath, file);

      if (storageError) {
        console.error(`Error uploading ${file.name}:`, storageError.message);
        continue;
      }

      // Create Database Record
      const { data: docData, error: dbError } = await supabase
        .from('machine_documents')
        .insert({
          machine_id: machineId,
          storage_path: storageData.path,
          filename: file.name,
          document_type: 'other', // Will be classified in Inventory Stage
          uploaded_by: user.id,
          processing_status: 'uploaded'
        })
        .select()
        .single();

      if (dbError) {
        console.error(`Error creating DB record for ${file.name}:`, dbError.message);
        // Bonus: try to cleanup storage if DB fails?
        continue;
      }

      uploadedDocuments.push(docData);
    }

    return NextResponse.json({
      success: true,
      count: uploadedDocuments.length,
      documents: uploadedDocuments
    });

  } catch (error: any) {
    console.error('Upload route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
