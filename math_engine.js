class MathEngine {
    constructor() {
        this.tiers = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];
    }

    generateQuestion(tierIndex) {
        // Safe guard tier index
        const tier = this.tiers[Math.min(tierIndex, 3)] || 'BRONZE';

        // Return object structure: { text: "2 + 2", answer: 4, distractors: [3, 5] }
        switch (tier) {
            case 'BRONZE': return this._generateBronze();
            case 'SILVER': return this._generateSilver();
            case 'GOLD': return this._generateGold();
            case 'DIAMOND': return this._generateDiamond();
            default: return this._generateBronze();
        }
    }

    // Helper: Random integer between min and max (inclusive)
    _rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Helper: Generate distractors close to answer
    _getDistractors(answer, isFraction = false) {
        const distractors = new Set();
        while (distractors.size < 2) {
            let d;
            if (isFraction) {
                // For simplified logic, distractors are just slightly different values
                // Represented as float for comparison, or we just store object?
                // For Diamond, we'll store answer as string "1/2" and value 0.5
                // This helper might need to be custom for Diamond.
                // General case:
                const offset = this._rand(-3, 3);
                d = answer + offset;
            } else {
                const offset = this._rand(1, 4) * (Math.random() < 0.5 ? -1 : 1);
                d = answer + offset;
            }

            if (d !== answer && !distractors.has(d)) {
                distractors.add(d);
            }
        }
        return Array.from(distractors);
    }

    _generateBronze() {
        // Add/Sub single digits (1-9)
        // Result must be positive
        const a = this._rand(1, 9);
        const b = this._rand(1, 9);
        const isAdd = Math.random() > 0.3; // 70% Add

        let answer, text;
        if (isAdd) {
            answer = a + b;
            text = `${a} + ${b} = ?`;
        } else {
            // Ensure positive result for Bronze
            const max = Math.max(a, b);
            const min = Math.min(a, b);
            answer = max - min;
            text = `${max} - ${min} = ?`;
        }

        return {
            text,
            answer,
            distractors: this._getDistractors(answer)
        };
    }

    _generateSilver() {
        // Mixed Add/Sub/Mul
        // a op b op c
        // Mul priority: 2 + 3 * 2

        const ops = ['+', '-', '*'];
        const op1 = ops[this._rand(0, 2)];

        // Keep numbers small for mental math
        const a = this._rand(2, 9);
        const b = this._rand(2, 9);

        let answer, text;

        if (op1 === '*') {
            answer = a * b;
            text = `${a} × ${b} = ?`;
        } else {
            const c = this._rand(1, 9);
            const op2 = ops[this._rand(0, 1)]; // Only + or - for second op to avoid complexity

            // a + b - c
            if (op1 === '+') answer = a + b;
            else answer = a - b;

            if (op2 === '+') { answer += c; text = `${a} ${op1} ${b} + ${c} = ?`; }
            else { answer -= c; text = `${a} ${op1} ${b} - ${c} = ?`; }
        }

        return {
            text,
            answer,
            distractors: this._getDistractors(answer)
        };
    }

    _generateGold() {
        // Introduce Negative Numbers
        // 3 - 8 = -5
        const a = this._rand(1, 10);
        const b = this._rand(11, 20);
        const answer = a - b;
        const text = `${a} - ${b} = ?`;

        return {
            text,
            answer,
            distractors: this._getDistractors(answer)
        };
    }

    _generateDiamond() {
        // Simple Fractions
        // 1/2 + 1/2 = 1
        // 1/4 + 2/4 = 3/4

        const denominators = [2, 4];
        const den = denominators[this._rand(0, 1)];

        let num1, num2;
        if (den === 2) {
            num1 = 1; num2 = 1; // 1/2 + 1/2
        } else {
            // den is 4
            num1 = this._rand(1, 3);
            num2 = this._rand(1, 3);
            // Ensure simple result
            if (num1 + num2 > 4) num2 = 1;
        }

        const numRes = num1 + num2;
        // Simplify logic (basic coverage)
        let answerText, answerVal;

        if (numRes === den) {
            answerText = "1";
            answerVal = 1;
        } else if (den === 4 && numRes === 2) {
            answerText = "1/2";
            answerVal = 0.5;
        } else {
            answerText = `${numRes}/${den}`;
            answerVal = numRes / den;
        }

        const text = `${num1}/${den} + ${num2}/${den} = ?`;

        // Distractors for fractions needs to return strings
        // Hardcode distractors for simplicity in this version logic
        const dists = [];
        if (answerVal === 1) dists.push("1/2", "3/4");
        else if (answerVal === 0.5) dists.push("1/4", "3/4");
        else if (answerVal === 0.25) dists.push("1/2", "3/4"); // 1/4
        else dists.push("1/2", "1"); // 3/4

        return {
            text,
            answer: answerText, // We compare strings for fractions or values? 
            // Best to use value for comparison but display text.
            // Let's store object { value: 0.5, display: "1/2" }
            answerValue: answerVal,
            isFraction: true,
            distractors: dists // simple strings
        };
    }
}

// Export for Node.js testing environment
if (typeof module !== 'undefined') {
    module.exports = MathEngine;
}
