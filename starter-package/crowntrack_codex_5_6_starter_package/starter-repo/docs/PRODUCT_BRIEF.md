# Product Brief — CrownTrack ADV

## One-line vision

CrownTrack ADV is a private offline-first GPS app for Alberta adventure-bike riders that combines GPX navigation, ride recording, offline map packs, Alberta public-land/trail awareness, buddy ride rooms, and emergency export tools.

## Primary user

A Yamaha Tenere 700 / ADV rider in Alberta riding with buddies across crown land, gravel roads, forestry roads, PLUZ areas, staging areas, and remote routes where cell service may be poor or absent.

## The app should replace these field workflows

- Taking screenshots of maps before a ride
- Loading GPX files into random apps
- Forgetting which map pack/route is installed offline
- Not knowing whether a route is inside an official/known riding area
- Losing buddy context when service drops
- Manually texting coordinates in an emergency

## App sections

### Map

The live ride screen.

Required concept elements:

- Offline map pack status
- GPS accuracy
- Active route/follow-line state
- Track recording state
- Big waypoint/hazard button
- Route progress and next maneuver/segment card
- Layer controls
- Legal/source confidence warnings

### Packs

Offline pack manager.

Required concept elements:

- Installed packs
- Available packs
- Queued/download/verifying/stale/corrupt states
- Pack manifest details
- Attribution bundle
- Layer registry
- Health check
- Source/licence audit status

### Plan

Pre-ride planning and audit.

Required concept elements:

- Import GPX
- Select route
- Pre-ride audit
- Check offline coverage
- Check warnings/source confidence
- Export/share GPX
- Fuel/camp/exit waypoint list later

### Crew

Private ride-room.

Required concept elements:

- Buddy cards
- Live/stale/no-service status
- Last known location
- Shared route
- Check-in status
- Later Meshtastic bridge state

### SOS

Emergency export and field tools.

Required concept elements:

- Current coordinates
- Copy/share coordinates
- Rescue GPX export
- Rider card
- Last 30 min track packet
- Check-in timer
- Offline limitations clearly stated

## First real build milestone

Build the native UI shell and domain contracts with mock data only.

Done means:

- App launches locally
- Shows all primary tabs
- Map screen resembles the product vision, but can use a mock map canvas/view
- UI is responsive on phone sizes
- Core mock data types exist
- No real external map/gps/network integration yet
