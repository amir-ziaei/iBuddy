import * as React from "react"
import type { LinksFunction, LoaderArgs, MetaFunction } from "@remix-run/node"
import { json } from "@remix-run/node"
import { Outlet, useLoaderData } from "@remix-run/react"

import {
  Box,
  Toolbar,
  List,
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
import {
  mdiChevronLeft,
  mdiMenu,
  mdiViewDashboard,
  mdiAccountPlus,
  mdiAccountGroup,
  mdiEmailPlus,
  mdiFilePlus,
  mdiFileDocumentMultiple,
  mdiAccountSupervisorCircleOutline,
  mdiAccountPlusOutline,
  mdiFrequentlyAskedQuestions,
} from "@mdi/js"

import { requireUser } from "~/session.server"
import { AppBar } from "~/components/dashboard/app-bar"
import { BackgroundLetterAvatars } from "~/components/avatar"
import { Drawer } from "~/components/dashboard/drawer"
import { PendingNavLink } from "~/components/link"
import { Copyright } from "~/components/coypright"
import { Role } from "~/models/user.server"
import { UserRoleChip } from "~/components/chips"

import dashboardStyles from "~/styles/dashboard.css"

export const meta: MetaFunction = () => {
  return {
    title: "Dashboard",
  }
}

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: dashboardStyles,
    },
  ]
}

export async function loader({ request }: LoaderArgs) {
  const user = await requireUser(request)

  return json({ user, isBuddy: user.role === Role.BUDDY })
}

const linkActiveClassName = "active-dashboard-navbar-link"

export default function DashboardRoute() {
  const { user, isBuddy } = useLoaderData<typeof loader>()

  const [isDrawerOpen, toggleDrawer] = React.useReducer(open => !open, true)

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

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="absolute" open={isDrawerOpen}>
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
              ...(isDrawerOpen && { display: "none" }),
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
                <UserRoleChip role={user.role} />
              </div>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleCloseUserMenu}>
              <form
                action="/auth/signout"
                method="post"
                style={{ width: "100%" }}
              >
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
      <Drawer variant="permanent" open={isDrawerOpen}>
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
          <PendingNavLink to="/dashboard" activeClassName={linkActiveClassName}>
            <ListItemButton>
              <ListItemIcon>
                <Icon path={mdiViewDashboard} size={1} />
              </ListItemIcon>
              <ListItemText color="text.primary" primary="Dashboard" />
            </ListItemButton>
          </PendingNavLink>
          <Divider sx={{ my: 1 }} />
          {isDrawerOpen ? (
            <ListSubheader component="div" inset>
              Mentee management
            </ListSubheader>
          ) : null}
          <PendingNavLink
            to="/dashboard/mentees"
            activeClassName={linkActiveClassName}
          >
            <ListItemButton>
              <ListItemIcon>
                <Icon path={mdiAccountSupervisorCircleOutline} size={1} />
              </ListItemIcon>
              <ListItemText primary="Mentees" />
            </ListItemButton>
          </PendingNavLink>
          {!isBuddy ? (
            <PendingNavLink
              to="/dashboard/mentees/new"
              activeClassName={linkActiveClassName}
            >
              <ListItemButton>
                <ListItemIcon>
                  <Icon path={mdiAccountPlusOutline} size={1} />
                </ListItemIcon>
                <ListItemText primary="New mentee" />
              </ListItemButton>
            </PendingNavLink>
          ) : null}
          <PendingNavLink
            to="/dashboard/mentees/email"
            activeClassName={linkActiveClassName}
          >
            <ListItemButton>
              <ListItemIcon>
                <Icon path={mdiEmailPlus} size={1} />
              </ListItemIcon>
              <ListItemText primary="Send email" />
            </ListItemButton>
          </PendingNavLink>
          {!isBuddy ? (
            <>
              <Divider sx={{ my: 1 }} />
              {isDrawerOpen ? (
                <ListSubheader component="div" inset>
                  User management
                </ListSubheader>
              ) : null}
              <PendingNavLink
                to="/dashboard/users"
                activeClassName={linkActiveClassName}
              >
                <ListItemButton>
                  <ListItemIcon>
                    <Icon path={mdiAccountGroup} size={1} />
                  </ListItemIcon>
                  <ListItemText primary="Users" />
                </ListItemButton>
              </PendingNavLink>
              <PendingNavLink
                to="/dashboard/users/new"
                activeClassName={linkActiveClassName}
              >
                <ListItemButton>
                  <ListItemIcon>
                    <Icon path={mdiAccountPlus} size={1} />
                  </ListItemIcon>
                  <ListItemText primary="New user" />
                </ListItemButton>
              </PendingNavLink>
            </>
          ) : null}
          <Divider sx={{ my: 1 }} />
          {isDrawerOpen ? (
            <ListSubheader component="div" inset>
              Asset management
            </ListSubheader>
          ) : null}
          <PendingNavLink
            to="/dashboard/assets"
            activeClassName={linkActiveClassName}
          >
            <ListItemButton>
              <ListItemIcon>
                <Icon path={mdiFileDocumentMultiple} size={1} />
              </ListItemIcon>
              <ListItemText primary="Assets" />
            </ListItemButton>
          </PendingNavLink>
          <PendingNavLink
            to="/dashboard/assets/new"
            activeClassName={linkActiveClassName}
          >
            <ListItemButton>
              <ListItemIcon>
                <Icon path={mdiFilePlus} size={1} />
              </ListItemIcon>
              <ListItemText primary="New asset" />
            </ListItemButton>
          </PendingNavLink>
          <Divider sx={{ my: 1 }} />
          <PendingNavLink
            to="/dashboard/faqs"
            activeClassName={linkActiveClassName}
          >
            <ListItemButton>
              <ListItemIcon>
                <Icon path={mdiFrequentlyAskedQuestions} size={1} />
              </ListItemIcon>
              <ListItemText primary="FAQs" />
            </ListItemButton>
          </PendingNavLink>
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
          position: "relative",
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Grid container spacing={3} px={3}>
            <Box sx={{ width: "100%", mt: 4 }}>
              <Outlet />
            </Box>
          </Grid>
        </Container>
        <div
          style={{
            position: "fixed",
            bottom: 0,
            right: 0,
          }}
        >
          <Copyright sx={{ px: 4, py: 1.5, textAlign: "right" }} />
        </div>
      </Box>
    </Box>
  )
}
