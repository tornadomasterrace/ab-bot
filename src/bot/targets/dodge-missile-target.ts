import { ITarget } from "./itarget";
import { IInstruction } from "../instructions/iinstruction";
import { IAirmashEnvironment } from "../airmash/iairmash-environment";
import { BotCharacter } from "../bot-character";
import { Calculations } from "../calculations";
import { AvoidObjectInstruction } from "../instructions/avoid-object-instruction";
import { Debug } from "../../helper/debug";
import { Missile } from "../airmash/missile";
import { FartInstruction } from "../instructions/fart-instruction";

export class DodgeMissileTarget implements ITarget {
    goal = 'dodge';

    private missileToAvoidId: number;

    constructor(private env: IAirmashEnvironment, private character: BotCharacter) {

        const me = env.me();
        const myTeam = me.team;
        const allMissiles = env.getMissiles();
        const hostileMissiles = allMissiles.filter(x => {
            if (!x.playerID) {
                // assume hostile
                return true;
            }
            if (x.playerID === me.id) {
                // my own missile
                return false;
            }
            var missileShooter = env.getPlayer(x.playerID);
            if (!missileShooter) {
                return true;
            }
            return missileShooter.team !== myTeam;
        });

        let closestObject: {
            distance: number,
            object: Missile
        };
        const myPos = env.me().pos;
        for (var i = 0; i < hostileMissiles.length; i++) {
            const delta = Calculations.getDelta(myPos, hostileMissiles[i].pos);
            if (!closestObject || delta.distance < closestObject.distance) {
                closestObject = {
                    object: hostileMissiles[i],
                    distance: delta.distance
                };
            }
        }

        if (closestObject) {
            const distanceToKeep = this.getDistanceToKeep();

            if (closestObject.distance < distanceToKeep) {
                this.missileToAvoidId = closestObject.object.id;
            }
        }
    }

    private getDistanceToKeep(): number {
        return this.character.missileDistance * (2 - this.env.me().health);
    }

    isValid(): boolean {
        const obj = this.getMissileToAvoid();

        if (!obj) {
            return false;
        }

        const delta = Calculations.getDelta(this.env.me().pos, obj.pos);
        return delta.distance < this.getDistanceToKeep();
    }

    private getMissileToAvoid(): Missile {
        var missile = this.env.getMissile(this.missileToAvoidId);
        return missile;
    }

    getInstructions(): IInstruction[] {
        const result = [];

        const missile = this.getMissileToAvoid();
        if (!missile) {
            return result;
        }

        var me = this.env.me();

        if (!missile.rot && missile.rot !== 0) {
            let rot = Math.atan2(missile.speed.y, missile.speed.x) + (Math.PI / 2);
            if (rot < 0) {
                rot += Math.PI * 2;
            }
            missile.rot = rot;
        }

        const delta = Calculations.getDelta(me.pos, missile.pos);

        let instruction: IInstruction;
        if (me.energy > 0.5 && me.type === 2 && delta.distance < 200) {
            // goliath can fart
            instruction = new FartInstruction();
        } else {
            instruction = new AvoidObjectInstruction(me.pos, me.rot, missile.pos, missile.rot);
        }
        result.push(instruction);

        return result;
    }

    onKill(killerID: number, killedID: number) {
    }


}