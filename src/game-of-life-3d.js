import * as THREE from 'https://unpkg.com/three@latest/build/three.module.js';
import textureSource from '/public/texture.png';

class GameOfLife3D {
	constructor(d = 25, starve = 3, live =5, survive = 6) {
        /*
        * working parameters:
        * * d = 25, starve = 3, live = 4, survive = 6 (default)
        * * d = 25, starve = 3, live = 5, survive = 6 (explosion)
        */
        this.dimension = d;
		this.makeArray(this.dimension);
        // The number of neighbors needed to starve/come alive/suffocate
        this.starve = starve;
        this.live = live;
        this.survive = survive;
        // Raycasting elements and such:
        this.casting = true;
        this.updating = false;
        this.densityBased = false;
        // Alive / Dead:
        this.ALIVE = 1;
        this.DEAD = 0;
	}

    /*
    * Make a 3D array of size d x d x d
    * @param {int} d - The dimension of the 3D array
    * @return {void}
    * @sideeffect - creates this.grid and this.needsUpdate 
    */
	makeArray(d) {
        // Actual alive/dead
		this.grid = new Array(d); // dimension 1
		for (let i = 0; i < this.dimension; i++) {
            this.grid[i] = new Array(d); // dimension 2
            for (let j = 0; j < this.dimension; j++) {
                this.grid[i][j] = new Array(d); // dimension 3
            }
		}
		// Whether or not to update each cell
		this.needsUpdate = new Array(d); // dimension 1
		for (let i = 0; i < this.dimension; i++) {
            this.needsUpdate[i] = new Array(d); // dimension 2
            for (let j = 0; j < this.dimension; j++) {
                this.needsUpdate[i][j] = new Array(d); // dimension 3
            }
		}

        this.pointsArray = new Array(d); // dimension 1
		for (let i = 0; i < this.dimension; i++) {
            this.pointsArray[i] = new Array(d); // dimension 2
            for (let j = 0; j < this.dimension; j++) {
                this.pointsArray[i][j] = new Array(d); // dimension 3
            }
		}
	}
    /*
    * Randomize the 3D array
    * @param {int} density_out_of_100 - The density of alive cells
    * @return {void}
    * @sideeffect - Sets this.grid and this.needsUpdate
    */
	randomizeArray(density_out_of_100 = 5) {
        // Randomize the grid's this.ALIVE/this.DEAD values
		for (var i = 0; i < this.dimension; i++) {
			for (var j = 0; j < this.dimension; j++) {
                for (var k = 0; k < this.dimension; k++) {
                    this.grid[i][j][k] = (Math.random() < density_out_of_100/100);
                }
			}
		}
        // Set some cells to update
		for (var i = 0; i < this.dimension; i = i+2) {
			for (var j = 0; j < this.dimension; j = j+2) {
                for (var k = 0; k < this.dimension; k = k+2) {
				this.needsUpdate[i][j][k]= 0;
                }
            }
        }
	}
    /*
    * Makes the points from scratch
    * @return {void}
    * @sideeffect - Sets this.pointsArray and this.grid
    */
    makePoints(parent) {
        this.parent = parent;
        // Point Geometry + Material:
        const pointGeo = new THREE.BufferGeometry();
        let pos = new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3);
        pointGeo.setAttribute("position", pos);
        // Creating Cube Mesh:
        const geometry = new THREE.BoxGeometry(1/this.dimension, 1/this.dimension, 1/this.dimension);
        // create each point:
        let textureLoader = new THREE.TextureLoader();
        let texture = textureLoader.load(textureSource);
        for (var i = 0; i < this.dimension; i++) {
            for (var j = 0; j < this.dimension; j++) {
                for (var k = 0; k < this.dimension; k++) {
                    this.grid[i][j][k] = 0; // make sure to deactivate everything
                    let col = Math.sqrt((i/(this.dimension) -.5)**2 + (j/(this.dimension) -.5)**2 + (k/(this.dimension) -.5)**2)
                    this.pointsArray[i][j][k] = new THREE.Mesh(geometry,  new THREE.MeshBasicMaterial({
                        color: new THREE.Color(i**.75/(this.dimension), j**.75/(this.dimension), k**.75/(this.dimension)),
                        transparent: true,
                        opacity: 0.75,
                        visible: false,
                        map: texture // Adds the little box texture to make it pretty
                    })); // make a point
                    this.pointsArray[i][j][k].clickable = false; // Make it so we can't click on this point... yet
                    parent.add(this.pointsArray[i][j][k]);
                    this.pointsArray[i][j][k].position.set(i/(this.dimension), j/(this.dimension), k/(this.dimension));
                }
            }
        }
        if (this.dimension % 2) { // if it's odd
            this.pointsArray[((this.dimension-1)/2)][((this.dimension-1)/2)][((this.dimension-1)/2)].material.visible = true;
            this.pointsArray[((this.dimension-1)/2)][((this.dimension-1)/2)][((this.dimension-1)/2)].clickable = 1;
            this.grid[((this.dimension-1)/2)][((this.dimension-1)/2)][((this.dimension-1)/2)] = 1;
        } else { // even
            this.pointsArray[this.dimension/2][this.dimension/2][this.dimension/2].material.visible = true;
            this.pointsArray[this.dimension/2][this.dimension/2][this.dimension/2].clickable = true;
            this.grid[this.dimension/2][this.dimension/2][this.dimension/2] = 1;
        }
    }

    reset() {
        // Reset each point:
        for (var i = 0; i < this.dimension; i++) {
            for (var j = 0; j < this.dimension; j++) {
                for (var k = 0; k < this.dimension; k++) {
                    this.grid[i][j][k] = 0; // make sure to deactivate everything
                    this.pointsArray[i][j][k].clickable = false; // Make it so we can't click on this point... yet
                    this.pointsArray[i][j][k].material.visible = false;                }
            }
        }
        if (this.dimension % 2) { // if it's odd
            this.pointsArray[((this.dimension-1)/2)][((this.dimension-1)/2)][((this.dimension-1)/2)].material.visible = true;
            this.pointsArray[((this.dimension-1)/2)][((this.dimension-1)/2)][((this.dimension-1)/2)].clickable = 1;
            this.grid[((this.dimension-1)/2)][((this.dimension-1)/2)][((this.dimension-1)/2)] = 1;
        } else { // even
            this.pointsArray[this.dimension/2][this.dimension/2][this.dimension/2].material.visible = true;
            this.pointsArray[this.dimension/2][this.dimension/2][this.dimension/2].clickable = true;
            this.grid[this.dimension/2][this.dimension/2][this.dimension/2] = 1;
        }
        this.recolor();
    }

    recolor() {
        // If we aren't density based, make the points a rainbow:
        let neighbors;
        if (!this.densityBased) {
            for (var i = 0; i < this.dimension; i++) {
                for (var j = 0; j < this.dimension; j++) {
                    for (var k = 0; k < this.dimension; k++) {
                        this.pointsArray[i][j][k].material.color = new THREE.Color(i**.75/(this.dimension), j**.75/(this.dimension), k**.75/(this.dimension));
                    }
                }
            }
        // If we are density based, make the points a gradient:
        } else {
            for (var i = 0; i < this.dimension; i++) {
                for (var j = 0; j < this.dimension; j++) {
                    for (var k = 0; k < this.dimension; k++) {
                        neighbors = this.countNeighbors(i, j, k);
                        this.pointsArray[i][j][k].material.color = new THREE.Color(neighbors/6, 1/8, 1/8);
                        if (neighbors <= 6) {
                            this.pointsArray[i][j][k].material.opacity = 0.75 - neighbors/26; 
                        }
                        else {
                            this.pointsArray[i][j][k].material.color = new THREE.Color(0xaaaaaa);
                            this.pointsArray[i][j][k].material.opacity = 1/3;
                        }
                    }
                }
            }
        }
    }

    /*
    * Update and draw the grid
    * @param {boolean} update - Whether or not to update the grid
    * @return {void}
    * @sideeffect - Sets this.grid and this.needsUpdate
    */
    updateAndDraw(update = true) {
        if (update == true) this.update(); // Update our game of life | should be done every few frames
        // Draw the points:
        for (var i = 0; i < this.dimension; i++) {
            for (var j = 0; j < this.dimension; j++) {
                for (var k = 0; k < this.dimension; k++) {
                    if (this.needsUpdate[i][j][k]) {
                        this.pointsArray[i][j][k].material.visible = this.grid[i][j][k];
                    } 
                }
            }
        }
        if (this.densityBased) this.recolor();
    }
    /*
    * Redo all the cells in the grid
    * @param {int} density - The density of alive cells
    * @return {void}
    * @sideeffect - Sets this.grid and this.needsUpdate
    */
    redoAll(density) {
        this.randomizeArray(density);
        for (var i = 0; i < this.dimension; i++) {
            for (var j = 0; j < this.dimension; j++) {
                for (var k = 0; k < this.dimension; k++) {
                    this.needsUpdate[i][j][k] = 1;
                    this.pointsArray[i][j][k].clickable = this.grid[i][j][k]; // can I raycast it?
                }
            }
        }
        this.recolor();
        this.updateAndDraw(false);
    }

    /*
    * Count the number of alive neighbors of a cell
    * @param {int} x - The x coordinate of the cell
    * @param {int} y - The y coordinate of the cell
    * @param {int} z - The z coordinate of the cell
    * @param {int[][][]} grid - The grid to count neighbors in
    * @return {int} - The number of alive neighbors
    * @sideeffect - None
    */
	countNeighbors(x, y, z, grid = this.grid) {
		var neighbors = 0;
		// check the 8 neighbors using two for loops
		for (var i = -1; i < 2; i++) {
            if (x+i < 0 || x+i >= this.dimension) continue; // cull early if out of bounds
			for (var j = -1; j < 2; j++) {
                if (y+j < 0 || y+j >= this.dimension) continue; // cull early if out of bounds
                for (var k = -1; k < 2; k++) {
                    if (z+k < 0 || z+k >= this.dimension) continue; // cull if out of bounds
                    // if the neighbor is alive and not the cell itself
                    if (grid[x+i][y+j][z+k] == 1 && !(i == 0 && j == 0 && k == 0)) {
                        neighbors++;
                    }
                }
			}
		}
		return neighbors;
	}

    /*
    * Deep clone a 3D array
    * @param {int[][][]} arr3d - The array to clone
    * @param {boolean} myWay - Whether or not to use my way of cloning
    * @return {int[][][]} - The cloned array
    * @sideeffect - None
    */
    deepClone3DArray(arr3d, myWay = true) {
        if (myWay) {
            return this.grid.map(function(arr1) {
                return arr1.map(function(arr2) {
                    return arr2.slice();
                }).slice();
            });
        }
        else {
            return arr3d.map(function(arr2d) {
                return arr2d.map(function(arr1d) {
                return arr1d.map(function(item) {
                    return Array.isArray(item) ? item.slice() : item;
                });
                });
            });
        }
    }

    /*
    * Update the grid
    * @param {void}
    * @return {void}
    * @sideeffect - Sets this.grid and this.needsUpdate
    */
	update() { 
        // deep clone the grid
        const old_grid = this.deepClone3DArray(this.grid, true);
		// Update each cell:
		for (var i = 0; i < this.dimension; i++) {
			for (var j = 0; j < this.dimension; j++) {
                for (var k = 0; k < this.dimension; k++) {
                    this.updateCell([i,j,k], this.countNeighbors(i, j, k, old_grid)); // update the cell
                }
			}
		}
	}
    /*
    * Update a cell with respect to the number of neighbors
    * @param {int[]} cell - The coordinates of the cell to update
    * @param {int} numNeighbors - The number of alive neighbors
    * @return {int} - The new value of the cell
    */
	updateCell(cell, numNeighbors){
		let i = cell[0]; let j = cell[1]; let k = cell[2];
        
        if (numNeighbors <= this.starve) { // in the original, <1 = this.DEAD
            this.swapLife(i, j, k, this.DEAD);
        }
        else if (numNeighbors > this.starve && numNeighbors <= this.live) { // in the original, 3 = this.ALIVE
            let update = ((this.grid[i][j][k] && !this.ALIVE) || (!this.grid[i][j][k] && this.ALIVE))
            this.swapLife(i, j, k, this.ALIVE, update)
        }
        else if (numNeighbors > this.live && numNeighbors <= this.survive) { // in the original, 2 = remains the same
            let update = ((this.grid[i][j][k] && !1) || (!this.grid[i][j][k] && 1))
            this.swapLife(i, j, k, this.grid[i][j][k], update)
        }
        else { // Too many neighbors, suffocate
            this.swapLife(i, j, k, this.DEAD);
        }
	}
    /*
    * Spawn a cell
    * @params {ints} i, j, k - The x, y, z coordinates of the cell
    * @params {int} newStatus - The new status of the cell
    * @params {boolean} update - Whether or not to update the cell
    * @return {void}
    */
    swapLife(i, j, k, newStatus, update = true) {
        this.needsUpdate[i][j][k] = update;
        this.grid[i][j][k] = newStatus;
    }

    /*
    * Places a block at the given position
    * @param {vector3} position - The position to place the block at
    * @return {void}
    */
    modifyBlock(position, alive) {
        if (position.x >= this.dimension || position.y >= this.dimension || position.z >= this.dimension) return;
        // Modify the block:
        this.grid[position.x][position.y][position.z] = alive;
        this.pointsArray[position.x][position.y][position.z].material.visible = alive;
        this.pointsArray[position.x][position.y][position.z].clickable = alive;
    }
}

export default GameOfLife3D;