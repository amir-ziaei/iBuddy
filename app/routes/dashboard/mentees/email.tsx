import * as React from "react"
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useSearchParams,
  useSubmit,
  useTransition,
} from "@remix-run/react"
import type {
  ActionArgs,
  LinksFunction,
  LoaderArgs,
  MetaFunction,
} from "@remix-run/server-runtime"
import { redirect } from "@remix-run/server-runtime"
import { json } from "@remix-run/server-runtime"
import invariant from "tiny-invariant"
import sanitizeHtml from "sanitize-html"

import CircularProgress from "@mui/material/CircularProgress"
import TextField from "@mui/material/TextField"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import type { SelectChangeEvent } from "@mui/material/Select"
import Select from "@mui/material/Select"
import OutlinedInput from "@mui/material/OutlinedInput"
import MenuItem from "@mui/material/MenuItem"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"
import FormHelperText from "@mui/material/FormHelperText"

import { useMenteeList } from "~/routes/resources/mentees"
import { useForm } from "~/components/hooks/use-form"
import {
  getAllEmailTemplates,
  getUserAccessibleAssets,
} from "~/models/asset.server"
import { requireUser } from "~/session.server"
import { Role } from "~/models/user.server"
import { validateAction, Zod } from "~/utils/validation"
import * as z from "zod"
import type { Mentee } from "~/models/mentee.server"
import { getMenteeListItems } from "~/models/mentee.server"
import {
  areAllowedVariables,
  resolveBody,
  sendEmail,
} from "~/utils/email-service"
import { PagePaper } from "~/components/layout"
import { isEmptyHtml } from "~/utils/common"
import localQuillStyles from "~/styles/quill.css"

const ReactQuill = React.lazy(() => import("react-quill"))

export const meta: MetaFunction = () => {
  return {
    title: "Send email - iBuddy",
  }
}

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: "https://unpkg.com/react-quill@1.3.3/dist/quill.snow.css",
    },
    {
      rel: "stylesheet",
      href: localQuillStyles,
    },
  ]
}

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)
  const isAdmin = user.role === Role.ADMIN
  const emailTemplates = await (isAdmin
    ? getAllEmailTemplates()
    : getUserAccessibleAssets(user.id, { type: "email-template" }))

  const emailTemplatesWithOnlyTheDataClientNeeds: Array<
    Pick<typeof emailTemplates[number], "id" | "name">
  > = emailTemplates.map(obj => ({
    id: obj.id,
    name: obj.name,
  }))

  return json({
    emailTemplates: emailTemplatesWithOnlyTheDataClientNeeds,
  })
}

const schema = z.object({
  recipients: Zod.requiredString("Recipient"),
  subject: Zod.requiredString("Title"),
  body: Zod.requiredString("Body").refine(
    body => !isEmptyHtml(body),
    "Body is required",
  ),
})

type ActionInput = z.TypeOf<typeof schema>

export async function action({ request }: ActionArgs) {
  const user = await requireUser(request)
  const { formData, errors } = await validateAction<ActionInput>({
    request,
    schema: schema,
  })
  if (errors) {
    return json({ errors }, { status: 400 })
  }
  const recipientEmails = formData.recipients.split(",").map(s => s.trim())
  const userMentees = await getMenteeListItems({ buddyId: user.id })
  const userMenteeEmails = userMentees.reduce(
    (acc: Record<Mentee["id"], boolean>, curr) => {
      acc[curr.email] = true
      return acc
    },
    {},
  )
  const areRecipientsValid = recipientEmails.every(
    email => userMenteeEmails[email],
  )
  if (!areRecipientsValid) {
    return json(
      { errors: { recipients: "Invalid recipients" } },
      { status: 400 },
    )
  }
  const sanitizedBody = sanitizeHtml(formData.body)
  const bodyVariables = sanitizedBody.match(/{{\s*[\w.]+\s*}}/g)

  if (!bodyVariables) {
    await sendEmail({
      to: recipientEmails,
      subject: formData.subject,
      htmlBody: sanitizedBody,
      senderName: user.firstName,
      replyTo: user.email,
    })
    return redirect("/dashboard/mentees")
  }

  if (!areAllowedVariables(bodyVariables)) {
    return json(
      { errors: { body: "Invalid variables in body", bodyVariables } },
      { status: 400 },
    )
  }

  const promises = recipientEmails.map(email => {
    const recipient = userMentees.find(mentee => mentee.email === email)
    invariant(recipient, "Recipient not found")
    return sendEmail({
      to: email,
      subject: formData.subject,
      htmlBody: resolveBody({ body: sanitizedBody, recipient }),
      senderName: user.firstName,
      replyTo: user.email,
    })
  })

  await Promise.all(promises)
  return redirect("/dashboard/mentees")
}

export default function EmailPage() {
  const { emailTemplates } = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const actionData = useActionData()
  const { register } = useForm(actionData?.errors)
  const transition = useTransition()
  const isSending =
    transition.state !== "idle" && Boolean(transition.submission)
  const { list: menteeList, isLoading: isMenteeListLoading } = useMenteeList({
    onlyMine: true,
  })
  // can't figure out the correct type for dynamically imported ReactQuill
  const editorRef = React.useRef<any>(null)

  const templateFetcher = useFetcher()
  const [editorContent, setEditorContent] = React.useState("")
  const template = templateFetcher.data?.template

  function handleChangeEmailTemplate(event: SelectChangeEvent) {
    const templateId = event.target.value
    if (!templateId) return
    templateFetcher.submit(
      { templateId },
      { method: "get", action: "/resources/email-template" },
    )
    setEditorContent("")
  }

  const [searchParams] = useSearchParams()
  const [recipients, setRecipients] = React.useState(() => {
    return searchParams.get("to")?.split(",") || []
  })
  const to = recipients.join(",")
  useUpdateQueryStringValueWithoutNavigation("to", to)

  React.useEffect(() => {
    if (template) {
      setEditorContent(template)
    }
  }, [template])

  const recipentsError = actionData?.errors?.recipients
  const bodyError = actionData?.errors?.body

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography
          component="h1"
          variant="h4"
          sx={{ color: "#505050", fontWeight: 600 }}
        >
          Send email
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <PagePaper>
          <form
            method="post"
            noValidate
            onSubmit={e => {
              e.preventDefault()
              const template = editorRef.current?.unprivilegedEditor.getHTML()
              const formData = new FormData(e.currentTarget)
              formData.append("body", template)
              submit(formData, { method: "post" })
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth required error={Boolean(recipentsError)}>
                  <InputLabel id="recipients-label">To</InputLabel>
                  <Select
                    labelId="recipients-label"
                    id="recipients"
                    name="recipients"
                    defaultValue={recipients}
                    input={<OutlinedInput label="To" />}
                    disabled={isMenteeListLoading}
                    onChange={e => setRecipients(e.target.value as string[])}
                    multiple
                  >
                    {menteeList.map(mentee => (
                      <MenuItem key={mentee.id} value={mentee.email}>
                        {mentee.firstName} {mentee.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{recipentsError}</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  variant="outlined"
                  label="Subject"
                  fullWidth
                  required
                  {...register("subject")}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="templates-label">Template</InputLabel>
                  <Select
                    labelId="templates-label"
                    id="templates"
                    defaultValue=""
                    input={<OutlinedInput label="Template" />}
                    onChange={handleChangeEmailTemplate}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {emailTemplates.map(template => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <React.Suspense fallback={<CircularProgress />}>
                  <FormControl fullWidth error={Boolean(bodyError)}>
                    <ReactQuill
                      value={editorContent}
                      onChange={setEditorContent}
                      theme="snow"
                      ref={editorRef}
                    />
                    <FormHelperText>{bodyError}</FormHelperText>
                  </FormControl>
                </React.Suspense>
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  disabled={isSending}
                  variant="contained"
                  fullWidth
                >
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </Grid>
            </Grid>
          </form>
        </PagePaper>
      </Grid>
    </Grid>
  )
}

function useUpdateQueryStringValueWithoutNavigation(
  queryKey: string,
  queryValue: string,
) {
  React.useEffect(() => {
    const currentSearchParams = new URLSearchParams(window.location.search)
    const oldQuery = currentSearchParams.get(queryKey) ?? ""
    if (queryValue === oldQuery) return
    if (queryValue) {
      currentSearchParams.set(queryKey, queryValue)
    } else {
      currentSearchParams.delete(queryKey)
    }
    const newUrl = [window.location.pathname, currentSearchParams.toString()]
      .filter(Boolean)
      .join("?")
    window.history.replaceState(null, "", newUrl)
  }, [queryKey, queryValue])
}
