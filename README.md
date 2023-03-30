# ROSMCT (Robot Operating System Mission Control Technologies)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg?maxAge=2592000)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/documentation-wiki-blue.svg?style=flat-square)](https://github.com/rosmod/rosmct/wiki)
[![npm](https://img.shields.io/npm/v/rosmct.svg)](https://www.npmjs.com/package/rosmct)
[![npm](https://img.shields.io/npm/dm/rosmct.svg)](https://www.npmjs.com/package/rosmct)
[![npm](https://img.shields.io/npm/dt/rosmct.svg)](https://www.npmjs.com/package/rosmct)

[![rosmct.collaborative-design.org](https://img.shields.io/website-up-down-green-red/https/rosmct.collaborative-design.org/index.html.svg?label=rosmct.collaborative-design.org)](https://rosmct.collaborative-design.org/index.html)

ROSMCT is a data visualization and telemetry system for [ROS](wiki.ros.org) built on nasa's [Open MCT](https://github.com/nasa/openmct). ROSMCT communicates to a [rosbridge](wiki.ros.org/rosbridge_suite) node using [roslibjs](wiki.ros.org/roslibjs). ROSMCT then uses the open mct platform to display and interact with the system.

# Architecture

ROSMCT consists of several distinct components

1. A rosbridge node running on the same roscore as the system of interest
2. A realtime server that manages the collection of ros systems, subscription of topics, and communication with openmct clients
3. A rosmct plugin used by openmct when clients connect that allows ros topics to be parsed by rosmct

`todo: graphic representation of ros mct architecture`

## Rosbridge

ROS wiki page: [wiki.ros.org/rosbridge_suite](wiki.ros.org/rosbridge_suite)
rosbridge github: [https://github.com/RobotWebTools/rosbridge_suite](https://github.com/RobotWebTools/rosbridge_suite)
rosbridge protocoal: [https://github.com/RobotWebTools/rosbridge_suite/blob/groovy-devel/ROSBRIDGE_PROTOCOL.md](https://github.com/RobotWebTools/rosbridge_suite/blob/groovy-devel/ROSBRIDGE_PROTOCOL.md)

Rosbridge runs on the local ros system and acts a a websocket server to translate ROS-to-JSON and JSON-to_ROS with remote systems. The main functions of rosbridge utilized by rosmct are to:
1. Query all available topics in the system
2. Allow web clients to subscribe to a topic in the system
3. (TODO) Allow web clients to publish to a topic in the system

`TODO: configuring the server-side connection between the realtime server and rosbridge (order of deployment, url/port, etc)`

## QuestDB setup

Recording historical telemetry requires setting up a QuestDB instance. This can be disabled with the `DISABLE_QUESTDB` environment variable.

The schema is as follow:

```sql
CREATE TABLE <rossystemname> (
  ts timestamp,
  id symbol,
  data string
) timestamp(ts);

CREATE TABLE dictionaries (
  dictionary string
);
```

## Roslibjs

`todo`

## Real-time Server

`todo`

### Ros System

`todo`

### Ros System Collection

`todo`

## Open MCT Client

`todo`

### ROS MCT Plugin

`todo`

# Dictionary Specification

`todo`
