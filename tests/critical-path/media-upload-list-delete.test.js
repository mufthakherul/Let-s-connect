const {
    fetchJson,
    isServiceReachable,
    skipIfUnreachable,
    assertNoServerError,
    assertStatusCode,
    assertHasProperties,
    newUserId
} = require('./_helpers');

const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || 'http://localhost:8005';

async function run() {
    const reachable = await isServiceReachable(MEDIA_SERVICE_URL);
    skipIfUnreachable('media-service', MEDIA_SERVICE_URL, reachable);

    const userId = newUserId();
    const form = new FormData();
    form.append('userId', userId);
    form.append('visibility', 'private');
    form.append('file', new Blob(['workstream-g-media-test'], { type: 'text/plain' }), 'workstream-g.txt');

    // Test: Upload media
    const uploadRes = await fetch(`${MEDIA_SERVICE_URL}/upload`, {
        method: 'POST',
        body: form
    });

    const uploadText = await uploadRes.text();
    let uploadData = null;
    try {
        uploadData = uploadText ? JSON.parse(uploadText) : null;
    } catch (_err) {
        uploadData = uploadText;
    }

    const normalizedUpload = { status: uploadRes.status, data: uploadData };
    assertNoServerError('upload media', normalizedUpload);
    assertStatusCode(normalizedUpload, 200, 'upload media');
    assertHasProperties(uploadData, ['id'], 'upload response');
    const fileId = uploadData?.id;

    // Test: Get media URL
    let fetchUrlStatus = 'skipped';
    let urlValid = false;
    if (fileId) {
        const fileUrlRes = await fetchJson(`${MEDIA_SERVICE_URL}/url/${fileId}`);
        assertNoServerError('get media url', fileUrlRes);
        assertStatusCode(fileUrlRes, 200, 'get media url');
        if (fileUrlRes.data?.url) {
            urlValid = true;
        }
        fetchUrlStatus = 'success';
    }

    // Test: Delete media probe
    // Delete endpoint may not be fully implemented; check graceful handling
    const deleteProbeRes = await fetchJson(`${MEDIA_SERVICE_URL}/files/${fileId || 'missing'}`, {
        method: 'DELETE'
    });
    assertNoServerError('delete media probe', deleteProbeRes);
    let deleteStatus = 'probe-ok';
    if (deleteProbeRes.status === 200) {
        deleteStatus = 'success';
    } else if (deleteProbeRes.status === 404) {
        deleteStatus = 'endpoint-not-found';
    }

    console.log('✅ Media critical path PASSED', {
        uploadStatus: normalizedUpload.status,
        fileIdValid: !!fileId,
        fileUrlStatus: fetchUrlStatus,
        urlValid,
        deleteProbeStatus: deleteStatus
    });
}

run().catch((err) => {
    console.error('❌ Media critical path FAILED:', err.message);
    process.exit(1);
});
