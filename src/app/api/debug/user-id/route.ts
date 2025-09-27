import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get user info from auth headers or query params
    const authHeader = request.headers.get('authorization');
    const userEmail = request.nextUrl.searchParams.get('email');

    // This is a debug endpoint to check user ID consistency
    const debugInfo = {
      timestamp: new Date().toISOString(),
      authHeader: authHeader ? 'Present' : 'Missing',
      userEmail: userEmail || 'Not provided',
      requestHeaders: {
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        host: request.headers.get('host')
      },
      url: request.url,
      searchParams: Object.fromEntries(request.nextUrl.searchParams.entries())
    };

    return NextResponse.json({
      success: true,
      message: 'User ID debug info',
      debugInfo,
      instructions: {
        step1: 'Log in on laptop and note your user.id',
        step2: 'Log in on iPhone with same account',
        step3: 'Check that user.id is identical on both devices',
        step4: 'Check browser console logs for OneSignal User ID'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userEmail, deviceInfo, oneSignalId } = body;

    // Log the user ID information for debugging
    console.log('=== USER ID DEBUG ===');
    console.log('User ID:', userId);
    console.log('User Email:', userEmail);
    console.log('OneSignal ID:', oneSignalId);
    console.log('Device Info:', deviceInfo);
    console.log('Timestamp:', new Date().toISOString());
    console.log('==================');

    return NextResponse.json({
      success: true,
      message: 'User ID logged for debugging',
      received: {
        userId,
        userEmail,
        deviceInfo,
        oneSignalId
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}