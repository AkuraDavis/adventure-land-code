function smart_potions() {
    if (safeties && mssince(last_potion) < min(200, character.ping * 3) || character.rip) return;

    let used = true;

    if (is_on_cooldown("use_hp")) return;

    if(character.hp/character.max_hp < 0.5) {
        use_skill('use_hp');
        log('Used Health Potion!');
    } else if (character.mp / character.max_mp < 0.5) {
        use_skill('use_mp');
        log('Used MP Potion!');
    } else {
       used = false;
    }
    if(used) {
        last_potion=new Date();
    }
}

function auto_attack(){
    if(!attack_mode || character.rip || is_moving(character)) return;

    let target=get_targeted_monster();
    if(!target)
    {
        target=get_nearest_monster({max_att: 80, type:mob_target});
        if(target) change_target(target);
        else
        {
            set_message("Pathing...");
            if(!is_moving(character)) {
                smart_move(mob_target);
            }
            return;
        }
    }

    trigger_skill('supershot');

    if(!is_in_range(target))
    {
        set_message("Approaching...");
        move_to_position(target, -character.range*.25);
    }

    if(can_attack(target))
    {
        set_message("Attacking");
        attack(target);
    }

    if(distance(character, target) < (character.range/2)){
        // Too close, move back

        set_message("Kiting...");
        move_to_position(target, character.range);
        // circle_strafe(target, character.range);
    }
}

let angle;
let last_x;
let last_y;
let deflection = 0; // Angle to adjust if stuck
let degrees = 2;

function move_to_position(target, enemydist) //Movement Algorithm
{
    try {
        console.log("Moving");
        // Calculate the difference between target and character positions
        let diff_x = target.real_x - character.real_x;
        let diff_y = target.real_y - character.real_y;

        // Calculate the new position to move the character away from the target, considering deflection
        let new_x = character.real_x - (diff_x * enemydist) + (Math.cos(deflection) * 0.5);
        let new_y = character.real_y - (diff_y * enemydist) + (Math.sin(deflection) * 0.5);

        console.log("Calculated initial xy");

        // Ensure the new_x and new_y are not farther away from target.real_x and target.real_y than enemydist
        let dist_from_target = Math.sqrt(Math.pow(target.real_x - new_x, 2) + Math.pow(target.real_y - new_y, 2));
        if (dist_from_target > enemydist) {
            let scaling_factor = enemydist / dist_from_target;
            let dx = new_x - target.real_x;
            let dy = new_y - target.real_y;
            let adjusted_dx = dx * Math.cos(deflection) - dy * Math.sin(deflection);
            let adjusted_dy = dx * Math.sin(deflection) + dy * Math.cos(deflection);
            new_x = target.real_x + (scaling_factor * adjusted_dx);
            new_y = target.real_y + (scaling_factor * adjusted_dy);
            console.log("Distance x/y");
        }

        // Check if the character is stuck

        let distance_x = Math.abs(last_x - character.real_x);
        let distance_y = Math.abs(last_y - character.real_y);
        if ((distance_x < 0.5 || distance_y < 0.5) && !can_move_to(new_x, new_y)) {
            console.log("Stuck!");
            // Character is stuck, increase deflection angle
            // deflection += 5 * Math.PI / 180; // Convert 5 degrees to radians

            let clockwise_path = get_first_pathable(target, enemydist, new_x, new_y);
            let counter_path = get_first_pathable(target, enemydist, new_x, new_y, false);

            console.log("Got paths.");

            if (abs(clockwise_path.d) <= abs(counter_path.d)) {
                new_x = clockwise_path.x;
                new_y = clockwise_path.y;
                log("Moving Clockwise");
            } else {
                new_x = counter_path.x;
                new_y = counter_path.y;
                log("Moving Counter-Clockwise");
            }

        } else {
            // Character is moving, reset deflection angle
            deflection = 0;
        }

        console.log("Draw line and move.");

        last_x = character.real_x;
        last_y = character.real_y;

        let line = draw_line(character.real_x, character.real_y, new_x, new_y, 2, 0x00FF00);
        // Only persist lines for a few seconds
        setTimeout(function(){
            line.destroy();
        },5000);

        move(new_x, new_y);
    } catch (error) {
        log("Issue: " + error);
    }
}

function get_first_pathable(target, enemydist, path_x, path_y, clockwise = true){
    let dist_from_target = Math.sqrt(Math.pow(target.real_x - path_x, 2) + Math.pow(target.real_y - path_y, 2));
    let deflection = 0;

    let loop = 0;
    let max_loop = 15;

    while (!can_move_to(path_x, path_y)) {
        if(loop >= max_loop){ break; }

        if(!clockwise) {
            deflection -= degrees * (Math.PI / 180); // Increase deflection by 5 degrees (converted to radians)
        } else {
            deflection += degrees * (Math.PI / 180); // Increase deflection by 5 degrees (converted to radians)
        }

        dist_from_target = Math.sqrt(Math.pow(target.real_x - path_x, 2) + Math.pow(target.real_y - path_y, 2));
        let scaling_factor = enemydist / dist_from_target;
        let dx = path_x - target.real_x;
        let dy = path_y - target.real_y;
        let adjusted_dx = dx * Math.cos(deflection) - dy * Math.sin(deflection);
        let adjusted_dy = dx * Math.sin(deflection) + dy * Math.cos(deflection);
        path_x = target.real_x + (scaling_factor * adjusted_dx);
        path_y = target.real_y + (scaling_factor * adjusted_dy);

        loop++;
    }
    
    return {d: deflection, x:path_x, y:path_y}
}

var prev_x = null;
var prev_y = null;
var initial_target_x = null;
var initial_target_y = null;
function circle_strafe(target, enemydist, clockwise = true){
    // Store the initial target coordinates if not already stored
    if (initial_target_x === null && initial_target_y === null) {
        initial_target_x = target.real_x;
        initial_target_y = target.real_y;
    }

    // Calculate the angle between the character and the target
    var angle = Math.atan2(character.real_y - initial_target_y, character.real_x - initial_target_x);

    // Calculate the direction of rotation based on the clockwise flag
    var rotationDirection = clockwise ? 1 : -1;

    // Calculate the next angle for moving in a circular path
    angle += rotationDirection * deflection;

    // Calculate the new position for moving in a circular path
    var new_x = initial_target_x + enemydist * Math.cos(angle);
    var new_y = initial_target_y + enemydist * Math.sin(angle);

    // Check if the character is stuck
    var isStuck = prev_x !== null && prev_y !== null && (Math.abs(prev_x - new_x) < 0.5 || Math.abs(prev_y - new_y) < 0.5);

    if (isStuck) {
        // Character is stuck, increase deflection until a movable coordinate is found
        while (!can_move_to(new_x, new_y)) {
            deflection += 5 * Math.PI / 180; // Increase deflection by 5 degrees (converted to radians)

            // Calculate the next angle for moving in a circular path
            angle += rotationDirection * deflection;

            // Calculate the new position for moving in a circular path
            new_x = initial_target_x + enemydist * Math.cos(angle);
            new_y = initial_target_y + enemydist * Math.sin(angle);
        }
    }

    draw_line(character.real_x, character.real_y, new_x, new_y, 2, 0x00FF00);

    // Call the move function with the new position if it is movable
    if (can_move_to(new_x, new_y)) {
        move(new_x, new_y);

        // Save the current position as the previously moved position
        prev_x = new_x;
        prev_y = new_y;
    }
}

function trigger_skill(skill_name){
    if (is_on_cooldown(skill_name)) return;

    let skill = G.skills[skill_name];

    if (character.mp < skill.mp) {
        use_skill('use_mp');
        log(skill_name+' needs mp pot!');
    }

    use_skill(skill_name);
    log('Used ' +skill_name+'!');
}

function restock(){
    let restocking = false;
    if(quantity('hpot0') < 50){
        set_message("Restocking...");

        if(!is_moving(character) && distance(character, find_npc('fancypots')) > 400) {
            if(!restocking) use_skill('use_town');
            restocking = true;

            smart_move(find_npc('fancypots'));
        } else {
            buy("hpot0", 100);
        }

    } else if(quantity('mpot0') < 50){
        set_message("Restocking...");

        if(!is_moving(character) && distance(character, find_npc('fancypots')) > 400) {
            if(!restocking) use_skill('use_town');
            restocking = true;
            smart_move(find_npc('fancypots'));
        } else {
            buy("mpot0", 100);
        }
    } else {
        restocking = false;
    }
}

let last_fr;
let last_fr_target;
let fr_attempts = 0;
let max_attempts = 10;
function auto_party(){
    let party = get_party();
    if(safeties && (JSON.stringify(party) !== "{}" || !autoparty)) return;

    let i = 0;
    let friends = ["Feriath"];

    if(last_fr_target && last_fr_target < friends.length){
        i = last_fr_target;
    }

    let target = friends[i];

    if (!last_fr) {
        last_fr = new Date(Date.now() - 8000);
    }
    if (mssince(last_fr) > 10000 && fr_attempts <= max_attempts) {
        send_party_invite(target);
        last_fr_target = i++;
        last_fr = new Date();
        fr_attempts++;
    }

    if(fr_attempts > max_attempts && mssince(last_fr) > 120000){
        fr_attempts = 0;
    }

}

function assist(){
    let party = get_party();
    let target = party[assist_target];

    if(!target || !assist_mode || assist_target == null) return;


    // Not on screen, path to
    if(!is_moving(character)) {
        if (!get_entity(assist_target)) {
            let map = character.map;
            if (target.map != character.map) {
                smart_move(target.map);
            } else {
                smart_move(target.x, target.y)
            }
        } else {
            smart_move(target.x, target.y)
        }
    }
}

let current_xp;
function xp_tracker(){
    if (!current_xp) current_xp = character.xp;

    if(character.xp !== current_xp) {
        log("Gained " + (character.xp - current_xp) + " xp!");
        current_xp = character.xp;
    }
}