class OctonionMultiplier {
    constructor() {
        this.currentRotation = 0;
        this.currentRuleIndex = 0;
        this.isDragging = false;
        this.lastMouseAngle = 0;
        this.startRotation = 0;
        this.rotaryMask = document.querySelector('.rotary-mask');
        this.rotaryWasher = document.querySelector('.rotary-washer');
        this.washerCircles = document.querySelectorAll('.rotary-washer circle');
        this.circles = document.querySelectorAll('.circle');
        this.multiplicationDisplay = document.getElementById('current-multiplication');
        
        // Calculator state
        this.calculatorMode = false;
        this.firstOperand = null;
        this.isAwaitingSecondOperand = false;
        
        // Octonion multiplication table: i_n × i_{n+1} = i_{n+3} (mod 7)
        this.multiplicationRules = [
            { formula: 'i₀i₁ = i₃', visibleUnits: [0, 1, 3] },
            { formula: 'i₁i₂ = i₄', visibleUnits: [1, 2, 4] },
            { formula: 'i₂i₃ = i₅', visibleUnits: [2, 3, 5] },
            { formula: 'i₃i₄ = i₆', visibleUnits: [3, 4, 6] },
            { formula: 'i₄i₅ = i₀', visibleUnits: [4, 5, 0] },
            { formula: 'i₅i₆ = i₁', visibleUnits: [5, 6, 1] },
            { formula: 'i₆i₀ = i₂', visibleUnits: [6, 0, 2] }
        ];
        
        // Complete octonion multiplication table
        this.octonionTable = this.buildOctonionTable();
        
        this.init();
    }
    
    init() {
        this.setupDragHandlers();
        this.setupKeyboardHandlers();
        this.setupClickHandlers();
        this.resetNodePositions(); // Reset any lingering position issues
        this.updateVisualization();
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }
    }
    
    resetNodePositions() {
        // Clear any inline styles that might be affecting positioning
        this.circles.forEach(circle => {
            circle.style.zIndex = '5'; // Start with nodes behind the mask
            circle.style.position = '';
            circle.style.left = '';
            circle.style.top = '';
            circle.style.transform = '';
            circle.style.pointerEvents = '';
        });
    }
    
    setupDragHandlers() {
        // Mouse events on the rotary mask
        this.rotaryMask.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // Touch events for mobile
        this.rotaryMask.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
            this.startDrag(e.touches[0]);
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault(); // Prevent scrolling only when dragging
                this.drag(e.touches[0]);
            }
        }, { passive: false });
        
        document.addEventListener('touchend', () => this.endDrag());
        
        // Prevent context menu on right click
        this.rotaryMask.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    getMouseAngle(clientX, clientY) {
        const rect = this.rotaryMask.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;
        return Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    }
    
    startDrag(event) {
        this.isDragging = true;
        this.startRotation = this.currentRotation;
        this.lastMouseAngle = this.getMouseAngle(event.clientX, event.clientY);
        this.rotaryMask.classList.add('dragging');
        
        // Clear calculator state and formula when starting rotation
        this.calculatorMode = false;
        this.firstOperand = null;
        this.isAwaitingSecondOperand = false;
        
        // Clear the formula display
        this.multiplicationDisplay.textContent = '';
        this.multiplicationDisplay.style.opacity = '1';
        
        // Put all nodes behind the mask during dragging
        this.circles.forEach(circle => {
            circle.style.zIndex = '5';
        });
        
        // Add transition removal for smooth dragging
        this.rotaryMask.style.transition = 'none';
        
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
    }
    
    drag(event) {
        if (!this.isDragging) return;
        
        const currentMouseAngle = this.getMouseAngle(event.clientX, event.clientY);
        let angleDelta = currentMouseAngle - this.lastMouseAngle;
        
        // Handle angle wrapping (crossing 180/-180 boundary)
        if (angleDelta > 180) angleDelta -= 360;
        if (angleDelta < -180) angleDelta += 360;
        
        this.currentRotation += angleDelta;
        this.lastMouseAngle = currentMouseAngle;
        
        this.rotaryMask.style.transform = `rotate(${this.currentRotation}deg)`;
    }
    
    endDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.rotaryMask.classList.remove('dragging');
        
        // Re-enable text selection
        document.body.style.userSelect = '';
        
        // Re-enable transitions for snapping
        this.rotaryMask.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        // Normalize rotation to 0-360 range to prevent spinning around multiple times
        const degreesPerPosition = 360 / 7;
        const normalizedRotation = ((this.currentRotation % 360) + 360) % 360;
        const targetRuleIndex = Math.round(normalizedRotation / degreesPerPosition) % 7;
        const snappedRotation = targetRuleIndex * degreesPerPosition;
        
        // Calculate the shortest path to the target
        const currentNormalized = ((this.currentRotation % 360) + 360) % 360;
        let rotationDiff = snappedRotation - currentNormalized;
        
        // If the difference is more than 180 degrees, go the other way
        if (rotationDiff > 180) {
            rotationDiff -= 360;
        } else if (rotationDiff < -180) {
            rotationDiff += 360;
        }
        
        this.currentRotation = this.currentRotation + rotationDiff;
        this.currentRuleIndex = targetRuleIndex;
        
        this.rotaryMask.style.transform = `rotate(${this.currentRotation}deg)`;
        
        // Restore display after a brief delay
        setTimeout(() => {
            // Just update node visibility for new position
            // Formula stays blank until user clicks a node
            this.updateVisualization();
        }, 200);
    }
    
    setupKeyboardHandlers() {
        // No visual focus indicator - just keyboard functionality
        document.addEventListener('keydown', (e) => {
            // Only respond to keyboard if no input is focused
            const activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA') {
                return;
            }
            
            // Allow arrow keys and space to rotate the dial
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
                e.preventDefault();
                this.rotateToNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.rotateToPrevious();
            }
        });
    }
    
    rotateToNext() {
        this.currentRuleIndex = (this.currentRuleIndex + 1) % 7;
        const targetRotation = this.currentRuleIndex * (360 / 7);
        
        // Calculate shortest path to target
        const currentNormalized = ((this.currentRotation % 360) + 360) % 360;
        let rotationDiff = targetRotation - currentNormalized;
        
        if (rotationDiff > 180) {
            rotationDiff -= 360;
        } else if (rotationDiff < -180) {
            rotationDiff += 360;
        }
        
        this.currentRotation = this.currentRotation + rotationDiff;
        this.rotaryMask.style.transform = `rotate(${this.currentRotation}deg)`;
        this.updateVisualization();
    }
    
    rotateToPrevious() {
        this.currentRuleIndex = (this.currentRuleIndex - 1 + 7) % 7;
        const targetRotation = this.currentRuleIndex * (360 / 7);
        
        // Calculate shortest path to target
        const currentNormalized = ((this.currentRotation % 360) + 360) % 360;
        let rotationDiff = targetRotation - currentNormalized;
        
        if (rotationDiff > 180) {
            rotationDiff -= 360;
        } else if (rotationDiff < -180) {
            rotationDiff += 360;
        }
        
        this.currentRotation = this.currentRotation + rotationDiff;
        this.rotaryMask.style.transform = `rotate(${this.currentRotation}deg)`;
        this.updateVisualization();
    }
    
    updateVisualization() {
        // Don't update if in calculator mode
        if (this.calculatorMode) {
            return;
        }
        
        // Get the current rule and visible units
        const currentRule = this.multiplicationRules[this.currentRuleIndex];
        
        // Reset all nodes to be behind the mask
        this.circles.forEach((circle, index) => {
            if (currentRule.visibleUnits.includes(index)) {
                // Make visible nodes clickable above the mask
                circle.style.zIndex = '15';
            } else {
                // Keep hidden nodes behind the mask
                circle.style.zIndex = '5';
            }
        });
        
        // Don't show any default formula - leave it blank
        // Formula will only appear when user clicks nodes
        
        // Update ARIA attributes for accessibility
        this.rotaryMask.setAttribute('aria-valuenow', this.currentRuleIndex);
        this.rotaryMask.setAttribute('aria-valuetext', `Position ${this.currentRuleIndex}`);
    }
    
    buildOctonionTable() {
        // Octonion multiplication based on visible triples and clockwise rule:
        // i_n² = -1 for all n
        // For visible triples L, M, N: i_L × i_M = ±i_N
        // Result is positive if L, M, N appear clockwise, negative if counter-clockwise
        const table = {};
        
        // Squares: i_n² = -1 for all n
        for (let i = 0; i <= 6; i++) {
            table[`${i},${i}`] = { result: -1, isNegative: false };
        }
        
        // Helper function to check if three numbers appear in clockwise order on the heptagon
        const isClockwise = (a, b, c) => {
            // For a heptagon with nodes 0,1,2,3,4,5,6 arranged clockwise,
            // check if the sequence a→b→c follows clockwise order
            
            // Normalize to 0-6 range
            a = ((a % 7) + 7) % 7;
            b = ((b % 7) + 7) % 7;
            c = ((c % 7) + 7) % 7;
            
            // Calculate positions in clockwise order
            // If a < b < c, they're obviously clockwise
            // Need to handle wraparound cases like 6,0,1 or 5,6,0
            
            if (a < b && b < c) return true;  // Simple case: 1,2,4
            if (a < b && c < a) return true;  // Wraparound case: 5,6,1  
            if (b < c && c < a) return true;  // Wraparound case: 6,1,3
            return false;
        };
        
        // The 7 visible triples (one for each rotation position)
        const visibleTriples = [
            [0, 1, 3], [1, 2, 4], [2, 3, 5], [3, 4, 6], 
            [4, 5, 0], [5, 6, 1], [6, 0, 2]
        ];
        
        // Generate all possible multiplications for pairs in visible triples
        for (let i = 0; i <= 6; i++) {
            for (let j = 0; j <= 6; j++) {
                if (i !== j) {  // Skip squares (already handled above)
                    // Find which visible triple contains both i and j
                    let foundTriple = null;
                    for (const triple of visibleTriples) {
                        if (triple.includes(i) && triple.includes(j)) {
                            foundTriple = triple;
                            break;
                        }
                    }
                    
                    if (foundTriple) {
                        // Find the third element in the triple
                        const third = foundTriple.find(x => x !== i && x !== j);
                        
                        // Determine sign based on clockwise order
                        const isPositive = isClockwise(i, j, third);
                        
                        table[`${i},${j}`] = { 
                            result: third, 
                            isNegative: !isPositive 
                        };
                    }
                }
            }
        }
        
        return table;
    }
    
    // Helper function to convert numbers to subscript notation
    toSubscript(number) {
        const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
        return `i${subscripts[number]}`;
    }
    
    setupClickHandlers() {
        this.circles.forEach(circle => {
            circle.addEventListener('click', (e) => {
                e.stopPropagation();
                const unitNumber = parseInt(circle.textContent);
                this.handleNodeClick(unitNumber);
            });
        });
    }
    
    handleNodeClick(unitNumber) {
        // Only allow clicks on nodes that have z-index 15 (currently visible above the mask)
        const clickedNode = this.circles[unitNumber];
        const nodeZIndex = parseInt(clickedNode.style.zIndex || '5');
        if (nodeZIndex !== 15) {
            return;
        }
        
        if (!this.calculatorMode || !this.isAwaitingSecondOperand) {
            // First click or any click when not awaiting second operand - show just the unit
            this.calculatorMode = true;
            this.firstOperand = unitNumber;
            this.isAwaitingSecondOperand = true;
            this.multiplicationDisplay.textContent = this.toSubscript(unitNumber);
            this.multiplicationDisplay.style.opacity = '1';
        } else if (this.isAwaitingSecondOperand) {
            // Second click - compute and show result
            this.computeResult(this.firstOperand, unitNumber);
            this.isAwaitingSecondOperand = false; // Stay in calculator mode but not awaiting
        }
    }
    
    computeResult(first, second) {
        const key = `${first},${second}`;
        const multiplication = this.octonionTable[key];
        
        if (multiplication) {
            let formula;
            if (first === second) {
                // Square case - use CSS positioning to stack superscript over subscript
                formula = `i<span class="sub-super"><span class="subscript">${first}</span><span class="superscript">2</span></span> = -1`;
            } else {
                // Regular multiplication
                if (multiplication.result === -1) {
                    // Special case where result is -1 (shouldn't happen with our table, but just in case)
                    formula = `${this.toSubscript(first)}${this.toSubscript(second)} = -1`;
                } else {
                    // Normal case with a specific octonion result
                    const sign = multiplication.isNegative ? '-' : '';
                    formula = `${this.toSubscript(first)}${this.toSubscript(second)} = ${sign}${this.toSubscript(multiplication.result)}`;
                }
            }
            this.multiplicationDisplay.innerHTML = formula; // Use innerHTML instead of textContent
        } else {
            // Fallback if multiplication not found
            this.multiplicationDisplay.textContent = `${this.toSubscript(first)}${this.toSubscript(second)} = ?`;
        }
        this.multiplicationDisplay.style.opacity = '1';
    }
    
    resetCalculator() {
        // Don't automatically reset - keep the result displayed
        // Calculator mode stays active until user clicks a new node
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new OctonionMultiplier();
});