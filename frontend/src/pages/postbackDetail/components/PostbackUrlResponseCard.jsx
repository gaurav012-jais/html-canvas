import { PostbackDetailField } from './PostbackDetailField'

export function PostbackUrlResponseCard({ data, lastFiredUrl }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3">
      <h2 className="text-sm font-semibold text-gray-800">Vendor postback URL / response</h2>
      <PostbackDetailField label="postback_url (template)">
        <span className="font-mono text-xs whitespace-pre-wrap">{data.postbackUrl}</span>
      </PostbackDetailField>
      {lastFiredUrl ? (
        <PostbackDetailField label="last fired URL">
          <span className="font-mono text-xs whitespace-pre-wrap text-indigo-800">
            {lastFiredUrl}
          </span>
        </PostbackDetailField>
      ) : null}
      {data.responseBody ? (
        <PostbackDetailField label="response_body">
          <pre className="mt-1 text-xs font-mono bg-gray-50 rounded-lg p-3 overflow-x-auto max-h-48">
            {data.responseBody}
          </pre>
        </PostbackDetailField>
      ) : null}
    </div>
  )
}
