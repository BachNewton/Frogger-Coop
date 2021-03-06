function Enemies() {
    this.enemies = [];
    this.enemiesForServer = [];
    this.TYPE = {
        SMALL: 0,
        MEDIUM: 1,
        LARGE: 2
    };
    this.lastSpawnTime = performance.now();
    this.stage = 1;
    setInterval(() => { this.stage++; }, 2500);

    this.restart = () => {
        this.enemies = [];
        this.lastSpawnTime = performance.now();
        this.stage = 1;
    };

    this.getTimeBetweenSpawnsMs = () => {
        // Logarithmic difficulty curve
        // Tool: https://keisan.casio.com/exec/system/14059930226691
        return 4833.333 + -868.589 * Math.log(this.stage);
    };

    this.update = (player, otherPlayers, shots, stats, collisions, bounds, ammo) => {
        if (performance.now() - this.lastSpawnTime > this.getTimeBetweenSpawnsMs()) {
            this.makeNewEnemy(bounds);
        }

        this.chasePlayers(player, otherPlayers);
        stats.points += this.collisionCheck(shots, collisions, ammo);
    };

    this.collisionCheck = (shots, collisions, ammo) => {
        var points = 0;

        for (var i = 0; i < shots.shots.length; i++) {
            var shot = shots.shots[i];

            for (var j = 0; j < this.enemies.length; j++) {
                var enemy = this.enemies[j];

                var box1 = {
                    x: shot.position.x,
                    y: shot.position.y,
                    width: shots.scale,
                    height: shots.scale
                };

                var box2 = {
                    x: enemy.position.x,
                    y: enemy.position.y,
                    width: this.getScale(enemy.type),
                    height: this.getScale(enemy.type)
                };

                if (collisions.isCollision(box1, box2)) {
                    shots.shots.splice(i, 1);
                    i--;

                    enemy.hp--;

                    if (enemy.hp <= 0) {
                        ammo.add(this.getCenter(enemy));
                        this.enemies.splice(j, 1);
                        j--;
                        points++;
                    }

                    break;
                }
            }
        }

        return points;
    };

    this.getScale = (type) => {
        switch (type) {
            case this.TYPE.SMALL:
                return 0.035;
            case this.TYPE.MEDIUM:
                return 0.07;
            case this.TYPE.LARGE:
                return 0.14;
        }

        return 0;
    };

    this.chasePlayers = (player, otherPlayers) => {
        for (var enemy of this.enemies) {
            if (enemy.target in otherPlayers.players) {
                var targetPlayer = otherPlayers.players[enemy.target];
                var playerCenter = otherPlayers.getCenter(targetPlayer);
                var x = playerCenter.x;
                var y = playerCenter.y;
            } else {
                // Warning: This logic can desynch enemies on the server
                var playerCenter = player.getCenter();
                var x = playerCenter.x;
                var y = playerCenter.y;
            }

            var speed = this.getSpeed(enemy.type);
            var center = this.getCenter(enemy);
            var angle = Math.atan2(y - center.y, x - center.x);

            enemy.position.x += speed * Math.cos(angle);
            enemy.position.y += speed * Math.sin(angle);
        }
    };

    this.getCenter = (enemy) => {
        return {
            x: enemy.position.x + this.getScale(enemy.type) / 2,
            y: enemy.position.y + this.getScale(enemy.type) / 2,
        };
    };

    this.getSpeed = (type) => {
        switch (type) {
            case this.TYPE.SMALL:
                return 0.004;
            case this.TYPE.MEDIUM:
                return 0.002;
            case this.TYPE.LARGE:
                return 0.002;
        }

        return 0;
    };

    this.updateServer = (socket) => {
        for (enemy of this.enemiesForServer) {
            socket.emit('new enemy', enemy.position, enemy.type);
        }

        this.enemiesForServer = [];
    };

    this.makeNewEnemy = (bounds) => {
        this.lastSpawnTime = performance.now();

        var position = this.getStartingPosition(bounds);

        var enemy = {
            position: position,
            type: this.getRandomType()
        };

        this.enemiesForServer.push(enemy);

        enemy.hp = this.getHP(enemy.type);
        enemy.target = 'you';
        this.enemies.push(enemy);
    };

    this.getHP = (type) => {
        switch (type) {
            case this.TYPE.SMALL:
                return 1;
            case this.TYPE.MEDIUM:
                return 1;
            case this.TYPE.LARGE:
                return 5;
        }

        return 1;
    };

    this.getRandomType = () => {
        var chance = Math.random();

        if (chance < 0.6) {
            return this.TYPE.MEDIUM;
        } else if (chance < 0.8) {
            return this.TYPE.SMALL;
        } else {
            return this.TYPE.LARGE;
        }
    };

    this.makeNewEnemyFromServer = (position, target, type) => {
        this.enemies.push({
            position: position,
            target: target,
            type: type,
            hp: this.getHP(type)
        });
    };

    this.getStartingPosition = (bounds) => {
        var position = {};

        if (Math.random() < 0.5) {
            position.x = bounds.leftX;
        } else {
            position.x = bounds.rightX;
        }

        if (Math.random() < 0.5) {
            position.y = bounds.topY;
        } else {
            position.y = bounds.bottomY;
        }

        return position;
    };

    this.draw = (ctx, size, xOffset, yOffset) => {
        for (var enemy of this.enemies) {
            var x = enemy.position.x;
            var y = enemy.position.y;

            ctx.fillStyle = this.getColor(enemy.type);
            var scale = this.getScale(enemy.type);
            ctx.fillRect(x * size + xOffset, y * size + yOffset, scale * size, scale * size);
        }
    };

    this.getColor = (type) => {
        switch (type) {
            case this.TYPE.SMALL:
                return 'magenta';
            case this.TYPE.MEDIUM:
                return 'lime';
            case this.TYPE.LARGE:
                return 'cyan';
        }

        return 'black';
    };
}