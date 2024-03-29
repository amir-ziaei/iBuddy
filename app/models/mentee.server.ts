import arc from "@architect/functions"
import cuid from "cuid"
import invariant from "tiny-invariant"

import type { CountryType } from "~/utils/country"
import type { User } from "./user.server"
import { Role } from "./user.server"

export const MENTEE_STATUS = {
  ASSIGNED: "assigned", // initial - when a mentee is created
  CONTACTED: "contacted", // when a buddy has contacted their mentee
  IN_TOUCH: "in_touch", // when the mentee responds and agrees to be mentored
  ARRIVED: "arrived", // when the mentee arrives in the country
  MET: "met", // when the buddy meets the mentee in person
  REJECTED: "rejected", // when the mentee responds but disagrees to be mentored
  UNRESPONSIVE: "unresponsive", // when the mentee does not respond at all
  SERVED: "served", // when the mentorship contract finishes
} as const

export type MenteeStatus = typeof MENTEE_STATUS[keyof typeof MENTEE_STATUS]

export type Mentee = Omit<User, "id" | "role" | "faculty"> & {
  id: ReturnType<typeof cuid>
  buddyId: User["id"]
  countryCode: CountryType["code"]
  homeUniversity: string
  hostFaculty: string
  gender: "male" | "female"
  degree: "bachelor" | "master" | "others"
  status: MenteeStatus
}

type MenteeItem = {
  pk: `Mentee#${Mentee["id"]}`
  sk: MenteeItem["pk"] | NoteItem["sk"]
}

type NoteItem = {
  pk: MenteeItem["pk"]
  sk: `Note#${Note["id"]}`
}

const id2pk = (id: Mentee["id"]): MenteeItem["pk"] => `Mentee#${id}`
const id2NoteSk = (id: Note["id"]): NoteItem["sk"] => `Note#${id}`

export type Note = {
  id: ReturnType<typeof cuid>
  content: string
  authorId: User["id"]
  createdAt: string
  updatedAt?: string
}

type NewNote = NoteItem & Note

export async function getMenteeById(id: Mentee["id"]): Promise<Mentee | null> {
  const key = id2pk(id)
  const db = await arc.tables()
  const result = await db.mentees.query({
    KeyConditionExpression: "pk = :pk and sk = :sk",
    ExpressionAttributeValues: {
      ":pk": key,
      ":sk": key,
    },
  })
  const record: Mentee | null = result.Items[0]
  return record
}

export async function getAllMentees(): Promise<Mentee[]> {
  const db = await arc.tables()
  const result = await db.mentees.scan({
    FilterExpression: "begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":sk": "Mentee#",
    },
  })
  return result.Items
}

export async function getMenteeListItems({
  buddyId,
}: {
  buddyId: Mentee["buddyId"]
}): Promise<Mentee[]> {
  const db = await arc.tables()
  const result = await db.mentees.query({
    IndexName: "menteesByBuddyId",
    KeyConditionExpression: "buddyId = :buddyId",
    ExpressionAttributeValues: { ":buddyId": buddyId },
  })
  return result.Items
}

export async function getMenteeCount({
  buddyId,
}: {
  buddyId: Mentee["buddyId"]
}): Promise<number> {
  const db = await arc.tables()
  const result = await db.mentees.query({
    IndexName: "menteesByBuddyId",
    KeyConditionExpression: "buddyId = :buddyId",
    ExpressionAttributeValues: { ":buddyId": buddyId },
    Select: "COUNT",
  })
  return result.Count ?? 0
}

export async function createMentee(
  newMentee: Omit<Mentee, "id" | "status">,
): Promise<Mentee> {
  const id = cuid()
  const key = id2pk(id)
  const status: MenteeStatus = "assigned"
  const db = await arc.tables()
  await db.mentees.put({
    pk: key,
    sk: key,
    id,
    status,
    ...newMentee,
    email: newMentee.email.toLowerCase(),
  })
  const mentee = await getMenteeById(id)
  invariant(mentee, "Mentee not found, something went wrong")
  return mentee
}

export async function updateMentee(updatedMentee: Mentee): Promise<Mentee> {
  const key = id2pk(updatedMentee.id)
  const db = await arc.tables()
  return await db.mentees.put({
    pk: key,
    sk: key,
    ...updatedMentee,
  })
}

export async function updateMenteeStatus(
  menteeId: Mentee["id"],
  newStatus: Mentee["status"],
) {
  const key = id2pk(menteeId)
  const db = await arc.tables()
  await db.mentees.update({
    Key: { pk: key, sk: key },
    UpdateExpression: "set #status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":status": newStatus },
  })
}

export async function deleteMentee(menteeId: Mentee["id"]): Promise<void> {
  const key = id2pk(menteeId)
  const db = await arc.tables()
  const notes = await getNotesOfMentee(menteeId)
  await Promise.all([
    db.mentees.delete({ pk: key, sk: key }),
    ...notes.map(note =>
      db.mentees.delete({ pk: key, sk: id2NoteSk(note.id) }),
    ),
  ])
}

export async function isEmailUnique(email: Mentee["email"]): Promise<boolean> {
  const db = await arc.tables()
  const result = await db.mentees.query({
    IndexName: "menteeByEmail",
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: { ":email": email },
    Select: "COUNT",
  })
  return result.Count === 0
}

export async function getNotesOfMentee(
  menteeId: Mentee["id"],
): Promise<Note[]> {
  const db = await arc.tables()
  const result = await db.mentees.query({
    KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":pk": id2pk(menteeId),
      ":sk": "Note#",
    },
  })
  return result.Items
}

export async function createNote({
  menteeId,
  content,
  authorId,
}: {
  menteeId: Mentee["id"]
  content: Note["content"]
  authorId: Note["authorId"]
}): Promise<Note> {
  const id = cuid()
  const db = await arc.tables()
  const newNote: NewNote = {
    pk: id2pk(menteeId),
    sk: id2NoteSk(id),
    id,
    content,
    authorId,
    createdAt: new Date().toISOString(),
  }
  const result = await db.mentees.put(newNote)
  return result
}

export async function getNote({
  menteeId,
  noteId,
}: {
  menteeId: Mentee["id"]
  noteId: Note["id"]
}): Promise<Note | null> {
  const db = await arc.tables()
  return db.mentees.get({
    pk: id2pk(menteeId),
    sk: id2NoteSk(noteId),
  })
}

export async function updateNote({
  menteeId,
  noteId,
  content,
}: {
  menteeId: Mentee["id"]
  noteId: Note["id"]
  content: Note["content"]
}): Promise<void> {
  const db = await arc.tables()
  await db.mentees.update({
    Key: {
      pk: id2pk(menteeId),
      sk: id2NoteSk(noteId),
    },
    UpdateExpression: "set content = :content, updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":content": content,
      ":updatedAt": new Date().toISOString(),
    },
  })
}

export async function deleteNote({
  menteeId,
  noteId,
}: {
  menteeId: Mentee["id"]
  noteId: Note["id"]
}): Promise<void> {
  const db = await arc.tables()
  await db.mentees.delete({
    pk: id2pk(menteeId),
    sk: id2NoteSk(noteId),
  })
}

export function canUserMutateMentee(user: User): boolean {
  return user.role !== Role.BUDDY
}

export function canUserMutateNote(user: User, note: Note): boolean {
  return user.id === note.authorId || user.role !== Role.BUDDY
}
