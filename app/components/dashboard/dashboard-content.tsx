import * as React from "react"

import type { ChipProps } from "@mui/material"
import {
  Box,
  Toolbar,
  List,
  Chip,
  Link,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  Divider,
  IconButton,
  Container,
  Grid,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from "@mui/material"
import Icon from "@mdi/react"
import { mdiChevronLeft, mdiMenu } from "@mdi/js"
import { mdiViewDashboard, mdiAccountPlus, mdiAccountGroup } from "@mdi/js"

import type { User } from "~/models/user.server"

import { PendingLink } from "../link"
import { Copyright } from "../coypright"
import { BackgroundLetterAvatars } from "../avatar"
import { AppBar } from "./app-bar"
import { Drawer } from "./drawer"

type Props = {
  user: User
  children?: React.ReactNode
}

export function DashboardContent({ children, user }: Props) {
  const [open, setOpen] = React.useState(true)
  const toggleDrawer = () => {
    setOpen(!open)
  }

  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null,
  )

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget)
  }

  const handleCloseUserMenu = () => {
    setAnchorElUser(null)
  }

  const userFullName = `${user.firstName} ${user.lastName}`

  const chipColor = {
    ADMIN: "warning",
    PRESIDENT: "error",
    HR: "info",
    BUDDY: "success",
  }[user.role] as ChipProps["color"]

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="absolute" open={open}>
        <Toolbar
          sx={{
            pr: "24px", // keep right padding when drawer closed
          }}
        >
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            sx={{
              marginRight: "36px",
              ...(open && { display: "none" }),
            }}
          >
            <Icon path={mdiMenu} size={1} />
          </IconButton>
          <Typography
            component="h1"
            variant="h6"
            color="inherit"
            noWrap
            sx={{ flexGrow: 1 }}
          >
            Dashboard
          </Typography>
          <Tooltip title="User menu">
            <IconButton color="inherit" onClick={handleOpenUserMenu}>
              <BackgroundLetterAvatars name={userFullName} />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                mt: 1.5,
                "& .MuiAvatar-root": {
                  ml: -0.5,
                  mr: 2,
                },
                "&:before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem>
              <BackgroundLetterAvatars
                name={userFullName}
                sx={{ width: 55, height: 55 }}
              />
              <div>
                <Typography gutterBottom>{userFullName}</Typography>
                <Chip size="small" label={user.role} color={chipColor} />
              </div>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleCloseUserMenu}>
              <form action="/auth/signout" method="post">
                <Link
                  sx={theme => ({
                    color: theme.palette.text.primary,
                    textDecoration: "none",
                  })}
                  component="button"
                  type="submit"
                  variant="body2"
                >
                  Sign out
                </Link>
              </form>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            px: [1],
          }}
        >
          <IconButton onClick={toggleDrawer}>
            <Icon path={mdiChevronLeft} size={1} />
          </IconButton>
        </Toolbar>
        <Divider />
        <List component="nav">
          <PendingLink to="/dashboard">
            <ListItemButton>
              <ListItemIcon>
                <Icon path={mdiViewDashboard} size={1} />
              </ListItemIcon>
              <ListItemText color="text.primary" primary="Dashboard" />
            </ListItemButton>
          </PendingLink>
          <Divider sx={{ my: 1 }} />
          <ListSubheader component="div" inset>
            Mentee management
          </ListSubheader>
          <PendingLink to="/dashboard/mentees">
            <ListItemButton>
              <ListItemIcon>
                <Icon path={mdiAccountGroup} size={1} />
              </ListItemIcon>
              <ListItemText primary="Mentees" />
            </ListItemButton>
          </PendingLink>
          <PendingLink to="/dashboard/mentees/new">
            <ListItemButton>
              <ListItemIcon>
                <Icon path={mdiAccountPlus} size={1} />
              </ListItemIcon>
              <ListItemText primary="New mentee" />
            </ListItemButton>
          </PendingLink>
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{
          backgroundColor: theme =>
            theme.palette.mode === "light"
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          flexGrow: 1,
          height: "100vh",
          overflow: "auto",
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Grid container spacing={3} px={3}>
            {children}
          </Grid>
          <Copyright sx={{ pt: 4 }} />
        </Container>
      </Box>
    </Box>
  )
}
