import { Box, Typography, Button, Paper } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { detectContentType, hasFormattedContent, formatJSON } from '@/utils/jsonFormatter'
import { isCurlRequest, extractCurlFromText } from '@/utils/curlFormatter'
import { containsMentions, convertMentionsToHtml } from '@/utils/mentionFormatter'

/**
 * Rich message body: JSON/code blocks, SQL, cURL, mentions, plain text.
 * Own messages pass isOwn to keep contrast on the primary-colored bubble.
 */
export default function RichContent({ content, isOwn }: { content: string; isOwn: boolean }) {
  if (isCurlRequest(content)) {
    const curl = extractCurlFromText(content) ?? content
    return (
      <CodeCard label="cURL" code={curl} isOwn={isOwn} />
    )
  }

  if (hasFormattedContent(content)) {
    const detected = detectContentType(content)
    const body = detected.type === 'json' ? formatJSON(detected.content) : detected.content
    return <CodeCard label={detected.language || detected.type.toUpperCase()} code={body} isOwn={isOwn} />
  }

  if (containsMentions(content)) {
    return (
      <Typography
        variant="body2"
        sx={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          '& .mention-tag': {
            bgcolor: 'rgba(255,255,255,0.22)',
            color: isOwn ? '#fff' : '#c79fff',
            px: 0.5,
            borderRadius: 0.5,
            fontWeight: 700,
          },
        }}
        dangerouslySetInnerHTML={{ __html: convertMentionsToHtml(content) }}
      />
    )
  }

  return (
    <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
      {content}
    </Typography>
  )
}

function CodeCard({ label, code, isOwn }: { label: string; code: string; isOwn: boolean }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {}
  }
  return (
    <Paper
      sx={{
        bgcolor: 'rgba(0,0,0,0.35)',
        borderRadius: 1.5,
        overflow: 'hidden',
        my: 0.5,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.25, bgcolor: 'rgba(255,255,255,0.06)' }}>
        <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: 'monospace' }}>
          {label}
        </Typography>
        <Button size="small" startIcon={<ContentCopyIcon sx={{ fontSize: 13 }} />} onClick={copy} sx={{ minWidth: 0, fontSize: 11, color: 'inherit', opacity: 0.8 }}>
          Copy
        </Button>
      </Box>
      <Box component="pre" sx={{ m: 0, p: 1, overflowX: 'auto', fontSize: 12, fontFamily: 'monospace', color: isOwn ? '#fff' : '#e2e2e2' }}>
        {code}
      </Box>
    </Paper>
  )
}
