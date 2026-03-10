const {
  fetchJson,
  isServiceReachable,
  skipIfUnreachable,
  assertNoServerError,
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

  const fileId = uploadData?.id;
  let fetchUrlStatus = 'skipped';

  if (fileId) {
    const fileUrlRes = await fetchJson(`${MEDIA_SERVICE_URL}/url/${fileId}`);
    assertNoServerError('get media url', fileUrlRes);
    fetchUrlStatus = fileUrlRes.status;
  }

  // Delete endpoint is not implemented yet in media-service.
  // Baseline check: route should not return a server error.
  const deleteProbeRes = await fetchJson(`${MEDIA_SERVICE_URL}/files/${fileId || 'missing'}`, {
    method: 'DELETE'
  });
  assertNoServerError('delete media probe', deleteProbeRes);

  console.log('✅ Media critical path baseline passed', {
    uploadStatus: normalizedUpload.status,
    fileUrlStatus: fetchUrlStatus,
    deleteProbeStatus: deleteProbeRes.status
  });
}

run().catch((err) => {
  console.error('❌ Media critical path baseline failed:', err);
  process.exit(1);
});
