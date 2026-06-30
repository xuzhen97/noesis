# Noesis Domain Context

Noesis 灵识 is a personal Human-AI Symbiotic Workspace: one Gateway coordinates AI agents, remote machines, commands, files, Pi sessions, transfers, and audited automation.

## Language

**Noesis**:
The product as a whole: a personal workspace that connects human intent, AI agents, and remote machines.
_Avoid_: Agent gateway, remote control tool

**Gateway**:
The central control plane that owns API access, machine registry, task orchestration, audit, and coordination.
_Avoid_: Server when discussing product role

**Client Agent**:
The resident process on a target machine that connects outward to the Gateway and performs local execution.
_Avoid_: Worker daemon, remote shell

**Machine**:
A registered Windows, Linux, or macOS target represented by a Client Agent heartbeat and capabilities.
_Avoid_: Host when the product resource is meant

**Task**:
An observable execution unit created by the Gateway and dispatched to a Client Agent.
_Avoid_: Job unless referring to external systems

**Task Event**:
An append-only event for task logs, progress, stdout/stderr, lifecycle, and evidence.
_Avoid_: Log line only
