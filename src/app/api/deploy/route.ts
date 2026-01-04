import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gitUrl, projectName } = body;

    // Validate input
    if (!gitUrl || !projectName) {
      return NextResponse.json(
        { error: 'Missing required fields: gitUrl and projectName' },
        { status: 400 }
      );
    }

    // Validate GitHub URL
    if (!gitUrl.includes('github.com')) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL' },
        { status: 400 }
      );
    }

    // Sanitize project name: lowercase, replace non-alphanumeric with '-'
    const safeName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Generate Yandex Container Registry image
    const targetImage = `cr.yandex/crp-placeholder/${safeName}:v1`;
    const domain = `${safeName}.ruvercel.app`;

    // Mock validation: assume it's a Next.js project
    // In production, this would check the repository structure

    // Generate project ID
    const id = `proj_${Date.now()}`;

    // Return project data
    const project = {
      id,
      name: projectName,
      status: 'Сборка', // Will be localized on client
      repoUrl: gitUrl,
      targetImage,
      domain,
      lastDeployed: 'Только что', // Will be localized on client
    };

    // Log Yandex Registry URL as requested
    console.log('Yandex Container Registry URL:', targetImage);

    return NextResponse.json(project, { status: 200 });
  } catch (error) {
    console.error('Deploy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

