# ROSMCT (Robot Operating System Mission Control Technologies)

ROSMCT is a data visualization and telemetry system for [ROS](wiki.ros.org) built on nasa's [Open MCT](https://github.com/nasa/openmct). ROSMCT communicates to a [rosbridge](wiki.ros.org/rosbridge_suite) node using [roslibjs](wiki.ros.org/roslibjs). ROSMCT then uses the open mct platform to display and interact with the system.

# Architecture

ROSMCT consists of several distinct components

1. A rosbridge node running on the same roscore as the system of interest
2. A realtime server that manages the collection of ros systems, subscription of topics, and communication with openmct clients
3. A rosmct plugin used by openmct when clients connect that allows ros topics to be parsed by rosmct

`todo: graphic representation of ros mct architecture`

## Rosbridge

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

## Dictionary Specification

`todo`
