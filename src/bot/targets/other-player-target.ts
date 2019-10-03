import { PlayerInfo } from "../airmash/player-info";
import { ITarget } from "./itarget";
import { GotoLocationInstruction } from "../instructions/goto-location";
import { IInstruction } from "../instructions/iinstruction";
import { Calculations } from "../calculations";
import { FireInstruction } from "../instructions/fire-instruction";
import { BotCharacter } from "../bot-character";
import { Pos } from "../pos";
import { GotoLocationConfig } from "../instructions/goto-location-config";
import { IAirmashEnvironment } from "../airmash/iairmash-environment";
import { getPlayersSortedByDistance } from "./get-closest-player";

export class OtherPlayerTarget implements ITarget {

    private readonly targetID: number;
    private shouldRecycle: boolean;
    private gotoLocationConfig = new GotoLocationConfig();

    goal = "fight";

    constructor(private env: IAirmashEnvironment, private character: BotCharacter) {

        let victim: PlayerInfo;
        const me = env.me();

        const enemies = getPlayersSortedByDistance(env, true)
            .filter(x => x.player.team !== me.team)
            .filter(x => this.isTargetValid(x.player));

        const withinRange = enemies.filter(x => x.delta.distance < character.firingRange);
        if (withinRange.length > 0) {
            withinRange.sort((a, b) => {
                if (a.player.health < b.player.health) {
                    return -1;
                } else if (a.player.health > b.player.health) {
                    return 1;
                }
                return 0;
            });
            victim = withinRange[0].player;
        }

        if (enemies.length > 0) {
            victim = victim || enemies[0].player;
        }

        if (victim) {
            this.targetID = victim.id;
            console.log(`selected other player '${victim.name}' with health '${victim.health}`);
        }
    }

    private getTarget(): PlayerInfo {
        if (this.targetID) {
            var p = this.env.getPlayer(this.targetID);
            if (!p) {
                console.log("Target disappeared");
            }
            return p;
        }
        return null;
    }

    onKill(killerID: number, killedID: number) {
        if (this.targetID === killedID) {
            console.log("Target was killed");
            this.shouldRecycle = true;
        }
        if (this.env.me().id === killedID) {
            this.shouldRecycle = true;
        }
    }

    getInstructions(): IInstruction[] {
        const result = [];

        const targetPos = this.getTargetPos(this.character.predictPositions);
        if (!targetPos) {
            return result;
        }

        this.gotoLocationConfig.desiredDistanceToTarget = this.character.intimateRange;
        this.gotoLocationConfig.targetPos = targetPos;

        var instruction = new GotoLocationInstruction(this.env, this.character, this.targetID);
        instruction.configure(this.gotoLocationConfig);
        result.push(instruction);

        const me = this.env.me();
        const delta = Calculations.getDelta(me.pos, targetPos);
        if (delta) {
            if (delta.distance < this.character.firingRange) {
                result.push(new FireInstruction());
            }
        }

        return result;
    }

    private getTargetPos(predictPositions: boolean): Pos {
        var t = this.getTarget();
        if (t) {
            let pos = PlayerInfo.getMostReliablePos(t);

            if (predictPositions && pos.isAccurate) {
                pos = Calculations.predictPosition(this.env.getPing(), pos, t.speed);
            }

            return pos;
        }
        return null;
    }

    private isTargetValid(t: PlayerInfo) {
        return t && !t.isStealthed && !t.isHidden && !t.hasInferno && !t.hasShield;
    }

    isValid(): boolean {
        if (this.shouldRecycle) {
            return false;
        }

        const target = this.getTarget();
        if (!this.isTargetValid(target)) {
            console.log("Dropped target");
            return false;
        }

        return true;
    }
}