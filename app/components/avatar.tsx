import type { AvatarProps } from "@mui/material/Avatar"
import Avatar from "@mui/material/Avatar"

function stringToColor(string: string) {
  let hash = 0
  let i

  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash)
  }

  let color = "#"

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff
    color += `00${value.toString(16)}`.slice(-2)
  }

  return color
}

function stringAvatar(name: string) {
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
    children: `${name.split(" ")[0][0]}${name.split(" ")[1][0]}`,
  }
}

export function BackgroundLetterAvatars({
  name,
  sx: userProvidedSx,
  ...rest
}: {
  name: string
} & Omit<AvatarProps, "children">) {
  const { sx: avatarSx, children } = stringAvatar(name)
  const sx = { ...avatarSx, ...userProvidedSx }
  return (
    <Avatar role="user-avatar" {...rest} sx={sx}>
      {children}
    </Avatar>
  )
}
