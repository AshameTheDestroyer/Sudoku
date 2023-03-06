const ROOT = document.querySelector(":root");

const GRID_TABLE_BACKGROUND_OFFSET_INTERVAL = 50;

const SYMBOLS = Array(36)
    .fill(null)
    .map((_, i) => i <= 9 ? i : String.fromCharCode("A".charCodeAt(0) + i - 10))
    .reduce((previous, current) => `${previous}${current}`) + "";

const DIGITS = SYMBOLS.substring(1, SYMBOLS.indexOf("9") + 1) + "",
    DIMENSIONS = ~~Math.sqrt(DIGITS.length),
    UPPER_DIMENSIONS = DIMENSIONS * DIMENSIONS;

let Squares = [[CreateSquare()]],
    Grids = [[CreateGrid()]];

Squares = Array(DIMENSIONS).fill(null).map(_ => Array(DIMENSIONS).fill(null));
Grids = Array(UPPER_DIMENSIONS).fill(null).map(_ => Array(UPPER_DIMENSIONS).fill(null));

let SelectedGrid = CreateGrid();
SelectedGrid = null;

let RowSets = [new Set([0])],
    ColumnSets = [new Set([0])];

RowSets = Array(UPPER_DIMENSIONS).fill(null).map(_ => new Set());
ColumnSets = Array(UPPER_DIMENSIONS).fill(null).map(_ => new Set());

const SCANNING_CASE = {
    Columns: "columns",
    Rows: "rows",
    Digits: "digits",
};

const MAXIMUM_HINT_COUNT = 3;

let IsTakingNotes = false,
    AvailableHintCount = MAXIMUM_HINT_COUNT;

const GRID_TABLE_ELEMENT = document.querySelector("#grid-table"),
    JUMP_TO_TOP_BUTTON = document.querySelector("#jump-to-top-button"),
    TAKE_NOTE_BUTTON = document.querySelector("#take-note-button"),
    HINT_BUTTON = document.querySelector("#hint-button"),
    ERASE_BUTTON = document.querySelector("#erase-button"),
    DIGIT_BUTTON_CONTAINER = document.querySelector("#digit-button-container"),
    NEW_PUZZLE_BUTTON = document.querySelector("#new-puzzle-button"),
    SOLVE_PUZZLE_BUTTON = document.querySelector("#solve-puzzle-button"),
    TIMER_DISPLAYER = document.querySelector("#timer-displayer p"),
    NAV_BAR_BUTTON = document.querySelector("#nav-bar-button"),
    TIMER_TOGGLE_BUTTON = document.querySelector("#timer-displayer button");

let CurrentPuzzleTime = 0,
    TimerIntervalID = 0,
    IsGamePaused = true;

let CurrentDifficulty = "";

const DIFFICULTIES = {
    Easy: 45 / 9,
    Medium: 35 / 9,
    Hard: 25 / 9,
    Expert: 20 / 9,
    Evil: 15 / 9,
    Creation: 0,
};

const GRID_MINIMUM_AMOUNT = UPPER_DIMENSIONS * 2 - 1,
    GRID_VARIETY_RANGE = 5 / 9;

let EliminatedGrids = [CreateGrid()];
EliminatedGrids = [];

(
    /** Sets up the document. */
    function SetUp() {
        SetUpDocument();
        GenerateRandomColour();

        SetUpGridTable();
    }
)();

/** Creates a new element and added into a parent element.
* @param {String} type The type of the element that'll be created.
* @param {HTMLElement} parent The parent element that contains the element.
* @param {Number} tabIndex The index of which the element can be tabbed onto.
* @param {String | Array<String>} classList The class name of the element, or the class list of it.
* @param {String} id The identifier of the element.
* @returns The element after being created.
*/
function CreateElement(type, parent, tabIndex = -1, classList = [], id = null) {
    let element = document.createElement(type);

    parent.append(element);

    if (tabIndex >= 0) { element.tabIndex = tabIndex; }

    if (typeof (classList) == "string") { element.className = classList; }
    else { classList.forEach(className => element.classList.add(className)); }

    if (id != null) { element.id = id; }

    return element;
}

/** Sets up the document. */
function SetUpDocument() {
    document.body.addEventListener("keydown", e => {
        if (IsGamePaused) { return; }

        switch (e.key.toLowerCase()) {
            case "+": ToggleTakingNotes(); break;
            case "=": SolveGridTablePuzzle(); break;
            case "-": case "backspace": case "delete": EraseSelectedGrid(); break;
            case "/": ShowHint(); break;
        }
    });

    SetUpHeaderButtons();
    SetUpJumpToTopButton();
    SetUpPlayingButtons();
    SetUpDifficultyButtons();
    SetUpDigitButtons();
}

/** Sets up the button that jumps to top of the document. */
function SetUpJumpToTopButton() {
    const MINIMUM_NEEDED_SCROLL = 20;
    JUMP_TO_TOP_BUTTON.style.display = "none";

    window.addEventListener("scroll", e =>
        JUMP_TO_TOP_BUTTON.style.display = document.documentElement.scrollTop <= MINIMUM_NEEDED_SCROLL ? "none" : ""
    );

    JUMP_TO_TOP_BUTTON.addEventListener("click", e => document.documentElement.scrollTop = 0);
}

/** Sets up all the header buttons. */
function SetUpHeaderButtons() {
    NAV_BAR_BUTTON.addEventListener("click", e => { });
    TIMER_TOGGLE_BUTTON.addEventListener("click", e => {
        ToggleTimer();

        if (IsGamePaused) {
            GRID_TABLE_ELEMENT.setAttribute("paused", "");
            SOLVE_PUZZLE_BUTTON.setAttribute("disabled", "");
            return;
        }

        GRID_TABLE_ELEMENT.removeAttribute("paused");
        SOLVE_PUZZLE_BUTTON.removeAttribute("disabled");
    });
}

/** Sets up all the playing buttons. */
function SetUpPlayingButtons() {
    TAKE_NOTE_BUTTON.addEventListener("click", e => e.preventDefault() & ToggleTakingNotes());
    ERASE_BUTTON.addEventListener("click", e => e.preventDefault() & EraseSelectedGrid());
    HINT_BUTTON.addEventListener("click", e => ShowHint());

    NEW_PUZZLE_BUTTON.addEventListener("click", e => {
        GRID_TABLE_ELEMENT.removeAttribute("uninitialized");
        GRID_TABLE_ELEMENT.setAttribute("settingUp", "");
        NEW_PUZZLE_BUTTON.setAttribute("disabled", "");

        window.scrollTo(0, 0);
    });

    SOLVE_PUZZLE_BUTTON.addEventListener("click", e => {
        SolveGridTablePuzzle();

        window.scrollTo(0, 0);
    });
}

/** Sets up all the difficulty buttons. */
function SetUpDifficultyButtons() {
    const DIFFICULTY_BUTTONS = Array.from(document.querySelectorAll("#difficulty-button-container button")),
        DIFFICULTY_DISPLAYER = document.querySelector("#difficulty-displayer");;
    DIFFICULTY_BUTTONS.forEach(difficultyButton => {
        difficultyButton.addEventListener("click", e => {
            DIFFICULTY_DISPLAYER.innerText = `Difficulty: ${CurrentDifficulty = difficultyButton.innerText}`;

            GenerateGridTablePuzzle();
        });
    });
}

/** Toggles the ability to take notes */
function ToggleTakingNotes() {
    TAKE_NOTE_BUTTON.setAttribute("popUpInfo", (IsTakingNotes = !IsTakingNotes) ? "on" : "off");
    SelectGrid(SelectedGrid);
}

/** Erases the value of the current selected grid. */
function EraseSelectedGrid() {
    if (!SelectedGrid || SelectedGrid.generated) { return; }

    SetGridValue(SelectedGrid);
    SelectedGrid.generated = false;

    UpdateExistingSubGridsOfGrid(SelectedGrid);
    SelectedGrid.element.focus();
}

/** Shows a hint to solve the puzzle. */
function ShowHint() {
    if (!AvailableHintCount) { return; }

    HINT_BUTTON.setAttribute("popUpInfo", --AvailableHintCount);

    do {
        let grid = EliminatedGrids[~~(Math.random() * EliminatedGrids.length)];

        if (Grids[grid.i][grid.j].value != -1 && Grids[grid.i][grid.j].value == grid.value) { continue; }

        EliminatedGrids.filter(eliminatedGrid => eliminatedGrid != grid);

        SetGridValue(Grids[grid.i][grid.j], grid.value);
        GridFocus(grid.i, grid.j);

        grid.element.focus();
        grid.element.classList.add("generated");

        break;
    } while (true);

    if (!AvailableHintCount) { HINT_BUTTON.setAttribute("disabled", ""); }
}

/** Sets up all the necessary buttons of each digit, so accessibility is met to each device. */
function SetUpDigitButtons() {
    DIGIT_BUTTON_CONTAINER.style.setProperty("--dimensions", DIMENSIONS);

    Array.from(DIGITS).forEach(digit => {
        const BUTTON = CreateElement("button", DIGIT_BUTTON_CONTAINER);

        BUTTON.innerText = digit;
        BUTTON.setAttribute("disabled", "");

        BUTTON.addEventListener("click", e => e.preventDefault() & (SelectedGrid && InsertDigitToGrid(SelectedGrid, digit)));
    });
}

/** Generates a random colour for the grid table. */
function GenerateRandomColour() {
    const MAXIMUM_CIRCLE_DEGREE = 360;
    let hue = ~~(Math.random() * MAXIMUM_CIRCLE_DEGREE) + 1;

    ROOT.style.setProperty("--main-colour-hue", `${hue}deg`);

    const GRID_TABLE_ELEMENT = document.querySelector("#grid-table");
    let offset = 0;
    setInterval(() => {
        GRID_TABLE_ELEMENT.style.setProperty("--background-position-offset", `${offset++}rem`);
    }, GRID_TABLE_BACKGROUND_OFFSET_INTERVAL);
}

/** Sets up the table of grids of the Sudoku within the document. */
function SetUpGridTable() {
    GRID_TABLE_ELEMENT.style.setProperty("--dimensions", DIMENSIONS);

    Array.from(DIGITS).forEach((_, i) => InitializeSquare(GRID_TABLE_ELEMENT, i));
}

/** Initializes a new square within a grid table.
 * @param {HTMLElement} gridTableElement The grid table that the square will be inserted to.
 * @param {Number} i The index in which the square will be inserted into the grid table.
 */
function InitializeSquare(gridTableElement, i) {
    const SQUARE_ELEMENT = CreateElement("div", gridTableElement);

    let i_ = ~~(i / DIMENSIONS),
        j_ = i % DIMENSIONS;

    let grids = [];
    Array.from(DIGITS).forEach((_, j) => grids.push(InitializeGrid(SQUARE_ELEMENT, i, j)));

    Squares[i_][j_] = CreateSquare(SQUARE_ELEMENT, grids, i_, j_);
}

/** Initializes a new grid within a square.
 * @param {HTMLElement} squareElement The square that the grid will be inserted to.
 * @param {Number} i The index in which the grid will be inserted into the grid table of the square.
 * @param {Number} j The index in which the grid will be inserted into the square.
 * @returns An object of the created grid.
 */
function InitializeGrid(squareElement, i, j) {
    const GRID_ELEMENT = CreateElement("div", squareElement, -1, "generated"),
        GRID_ELEMENT_DISPLAYER = CreateElement("div", GRID_ELEMENT);

    let i_ = ~~(j / DIMENSIONS) + ~~(i / DIMENSIONS) * DIMENSIONS,
        j_ = (i % DIMENSIONS) * DIMENSIONS + j % (DIMENSIONS);

    // GRID_ELEMENT_DISPLAYER.innerText = `${i_}, ${j_}`;

    let subGrids = [];
    Array.from(DIGITS).forEach((_, i__) => subGrids.push(InitializeSubGrid(GRID_ELEMENT, i__)));

    let grid = CreateGrid(GRID_ELEMENT, -1, subGrids, i_, j_);

    GRID_ELEMENT.addEventListener("click", CreateGridClickEvent(grid));
    GRID_ELEMENT.addEventListener("keydown", CreateGridKeydownEvent(grid));
    GRID_ELEMENT.addEventListener("blur", e => DeselectGrid(false));

    return Grids[i_][j_] = grid;
}

/** Initializes a new sub grid within a grid.
 * @param {HTMLElement} gridElement The grid that the sub grid will be inserted to.
 * @param {Number} i The index in which the sub grid will be inserted into the grid.
 * @returns An object of the created sub grid.
 */
function InitializeSubGrid(gridElement, i) {
    const SUB_GRID_ELEMENT = CreateElement("div", gridElement);

    let i_ = ~~(i / DIMENSIONS),
        j_ = i % DIMENSIONS;

    // SUB_GRID_ELEMENT.innerText = i + 1;

    return CreateGrid(SUB_GRID_ELEMENT, -1, [], i_, j_);
}

/** Creates a new square object.
 * @param {HTMLElement} squareElement The HTML element of the square.
 * @param {Array<{
 *      element: HTMLElement,
 *      value: String,
 *      i: Number,
 *      j: Number,
 *      subGrids: Array<{
 *          gridElement: HTMLElement,
 *          value: String, 
 *          i: Number, 
 *          j: Number, 
 *      }>
 * }>} grids The grid objects contained within the square object.
 * @param {Number} i The index in which the square is stored at the x-axis.
 * @param {Number} j The index in which the square is stored at the y-axis.
 * @returns A new square object.
 */
function CreateSquare(squareElement, grids, i, j) {
    return {
        element: squareElement,
        grids: grids,
        i: i,
        j: j,
    };
}

/** Creates a new grid object.
 * @param {HTMLElement} gridElement The HTML element of the grid.
 * @param {String} value The value stored within the grid object.
 * @param {Array<{
 *      element: HTMLElement,
 *      value: String,
 *      i: Number,
 *      j: Number,
 * }>} subGrids The sub grid objects contained within the grid object.
 * @param {Number} i The index in which the grid is stored at the x-axis.
 * @param {Number} j The index in which the grid is stored at the y-axis.
 * @param {Boolean} generated Indicates whether or not the grid is generated and not placed by a person.
 * @returns A new grid object.
 */
function CreateGrid(gridElement, value, subGrids, i, j, generated = true) {
    return {
        element: gridElement,
        value: value,
        subGrids: subGrids,
        generated: generated,
        i: i,
        j: j,
    };
}

/** Creates a new grid click event.
 * @param {Object} grid The grid that'll be clicked.
 * @param {HTMLElement} grid.element
 * @param {String} grid.value
 * @param {Number} grid.i
 * @param {Number} grid.j
 * @param {Boolean} grid.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid.subGrids
 * @returns A new click event of the selected grid.
 */
function CreateGridClickEvent(grid) {
    return (e = new MouseEvent()) => {
        let PREVIOUS_SELECTED_GRID = DeselectGrid();
        if (grid.element == PREVIOUS_SELECTED_GRID) { return; }

        SelectGrid(grid);
    };
}

/** Deselects the current selected grid.
 * @param {Boolean} clearMemory Determines whether or not to clear the selected grid from memory.
 * @returns The element of the grid that was previously selected.
 */
function DeselectGrid(clearMemory = true) {
    if (clearMemory) { SelectedGrid = null; }

    const PREVIOUS_SELECTED_GRID = document.querySelector("#grid-table .selected-grid");
    PREVIOUS_SELECTED_GRID?.classList.remove("selected-grid");

    Array.from(document.querySelectorAll("#grid-table .neighbour-grid"))
        .forEach(grid_ => grid_.classList.remove("neighbour-grid"));

    Array.from(document.querySelectorAll("#grid-table .similar-grid"))
        .forEach(grid_ => grid_.classList.remove("similar-grid"));

    return PREVIOUS_SELECTED_GRID;
}

/** Selects a specified grid and its similar and neighbour grids.
 * @param {Object} grid The grid that'll be selected.
 * @param {HTMLElement} grid.element
 * @param {String} grid.value
 * @param {Number} grid.i
 * @param {Number} grid.j
 * @param {Boolean} grid.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid.subGrids
 */
function SelectGrid(grid) {
    SelectedGrid = grid;

    grid.element.classList.add("selected-grid");
    grid.element.focus();

    ForEachNeighbourGrid(grid, neighbourGrid => neighbourGrid.element.classList.add("neighbour-grid"));

    if (grid.value == -1) { return; }

    Grids.flat()
        .filter(grid_ => grid_.value == grid.value)
        .forEach(grid_ => grid_.element.classList.add("similar-grid"));
}

/** Sets a value to a specified grid.
 * @param {Object} grid The grid that its value will be set.
 * @param {HTMLElement} grid.element
 * @param {String} grid.value
 * @param {Number} grid.i
 * @param {Number} grid.j
 * @param {Boolean} grid.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid.subGrids
 * @param {String | null} value The value that'll be set to the grid.
 * @param {Boolean} isSubGrid Indicates whether or not the grid is a sub grid.
 */
function SetGridValue(grid, value = null, isSubGrid = false) {
    if (!isSubGrid) { grid.element.firstChild.innerText = value; }
    else { grid.element.innerText = value; }

    grid.value = value ?? -1;
    grid.generated = true;
}

/** Creates a new grid keydown event.
 * @param {Object} grid The grid that'll be pressed.
 * @param {HTMLElement} grid.element
 * @param {String} grid.value
 * @param {Number} grid.i
 * @param {Number} grid.j
 * @param {Boolean} grid.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid.subGrids
 * @returns A new keydown event of the selected grid.
 */
function CreateGridKeydownEvent(grid) {
    return (e = new KeyboardEvent()) => {
        e.preventDefault();

        if (IsGamePaused) { return; }

        let pressedValue;
        if (!grid.generated && DIGITS.includes(pressedValue = e.key.toUpperCase())) { InsertDigitToGrid(grid, pressedValue); return; }

        switch (e.key.toLowerCase()) {
            case "arrowup": case "w": GridFocus(grid.i - 1, grid.j); break;
            case "arrowdown": case "s": GridFocus(grid.i + 1, grid.j); break;
            case "arrowleft": case "a": GridFocus(grid.i, grid.j - 1); break;
            case "arrowright": case "d": GridFocus(grid.i, grid.j + 1); break;

            case "enter": case " ": case "spaceBar": grid.element.click(); break;
            case "escape": DeselectGrid(); break;

            case "-": case "backspace": case "delete": EraseSelectedGrid(); break;
        }
    };
}

/** Inserts a digit to a grid throughout the keyboard or the keypads buttons.
 * @param {Object} grid The grid that its neighbour grids a function will be applied on.
 * @param {HTMLElement} grid.element
 * @param {String} grid.value
 * @param {Number} grid.i
 * @param {Number} grid.j
 * @param {Boolean} grid.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid.subGrids
 * @param {String} digitValue The value of the digit that'll be inserted.
 */
function InsertDigitToGrid(grid, digitValue) {
    if (IsTakingNotes && grid.value != -1) { return; }

    let digitIndex = DIGITS.indexOf(digitValue);

    SetGridValue(IsTakingNotes ? grid.subGrids[digitIndex] : grid,
        IsTakingNotes && grid.subGrids[digitIndex].value == digitValue ? null : digitValue,
        IsTakingNotes);

    DeselectGrid();
    SelectGrid(grid);

    if (IsTakingNotes) { return; }

    grid.generated = false;
    UpdateExistingSubGridsOfGrid(grid);
}

/** Focuses on a grid at specified indices.
 * @param {Number} i The index in which the grid is stored at the x-axis.
 * @param {Number} j The index in which the grid is stored at the y-axis.
 */
function GridFocus(i, j) {
    let i_ = (i >= 0 ? i % (UPPER_DIMENSIONS) : UPPER_DIMENSIONS + i),
        j_ = (j >= 0 ? j % (UPPER_DIMENSIONS) : UPPER_DIMENSIONS + j);

    let neighbourGrid = Grids[i_][j_];
    neighbourGrid.element.focus();
    neighbourGrid.element.click();
}

/** Applies a function to each grid neighbouring a specified grid.
 * @param {Object} grid The grid that its neighbour grids a function will be applied on.
 * @param {HTMLElement} grid.element
 * @param {String} grid.value
 * @param {Number} grid.i
 * @param {Number} grid.j
 * @param {Boolean} grid.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid.subGrids
 * @param {(neighbourGrid: {
 *      element: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number,
 *      subGrids: Array<{
 *          gridElement: HTMLElement,
 *          value: String, 
 *          i: Number, 
 *          j: Number, 
 *      }>
 * }) => void} callback 
 */
function ForEachNeighbourGrid(grid, callback) {
    for (let x = 1; true; x++) {
        let neighbourGrids = [
            Grids[grid.i - x]?.[grid.j],
            Grids[grid.i + x]?.[grid.j],
            Grids[grid.i][grid.j - x],
            Grids[grid.i][grid.j + x],
        ];

        if (neighbourGrids.every(grid_ => grid_ == null)) { break; }

        neighbourGrids.forEach(neighbourGrid => neighbourGrid && callback(neighbourGrid));
    }
}

/** Starts the timer of the current puzzle.
 * @param {Boolean} reset Determines whether or not to reset the timer to zero.
 */
function StartTimer(reset = true) {
    const MAXIMUM_SECOND_VALUE = 60;

    if (reset) {
        CurrentPuzzleTime = 0;
        TIMER_DISPLAYER.innerText = "00:00";
    }

    IsGamePaused = false;
    TimerIntervalID && clearInterval(TimerIntervalID);

    TimerIntervalID = setInterval(() => {
        CurrentPuzzleTime++;

        const SECONDS = CurrentPuzzleTime % MAXIMUM_SECOND_VALUE,
            MINUTES = ~~(CurrentPuzzleTime / MAXIMUM_SECOND_VALUE),
            HOURS = ~~(CurrentPuzzleTime / (MAXIMUM_SECOND_VALUE * MAXIMUM_SECOND_VALUE));

        TIMER_DISPLAYER.innerText = `${HOURS ? `${DisplayNumber(HOURS)}:` : ''}${DisplayNumber(MINUTES)}:${DisplayNumber(SECONDS)}`;
    }, 1000);
}

/** Toggles the timer of the current puzzle.
 * @param {Boolean} reset Determines whether or not to reset the timer to zero.
 */
function ToggleTimer(reset = false) {
    if (IsGamePaused) {
        StartTimer(reset);
        TIMER_TOGGLE_BUTTON.removeAttribute("checked");

        Array.from(DIGIT_BUTTON_CONTAINER.querySelectorAll("button")).forEach(button => button.removeAttribute("disabled"));
        [TAKE_NOTE_BUTTON, ERASE_BUTTON, HINT_BUTTON].forEach(button => button.removeAttribute("disabled"));

        Grids.flat().forEach(grid => grid.element.tabIndex = 0);

        return;
    }

    clearInterval(TimerIntervalID);
    TIMER_TOGGLE_BUTTON.setAttribute("checked", "");

    Array.from(DIGIT_BUTTON_CONTAINER.querySelectorAll("button")).forEach(button => button.setAttribute("disabled", ""));
    [TAKE_NOTE_BUTTON, ERASE_BUTTON, HINT_BUTTON].forEach(button => button.setAttribute("disabled", ""));

    Grids.flat().forEach(grid => grid.element.tabIndex = -1);


    IsGamePaused = true;
}

/** Converts a number into a displayable string form with a specified amount of digits.
 * @param {Number} number The number that'll be displayed.
 * @param {Number} digitAmount The amount of digits that'll be always displayed.
 * @returns A string value representing the number in a displayable form.
 */
function DisplayNumber(number, digitAmount = 2) {
    let result = "",
        numberAsString = String(number);

    for (let i = 0; i < digitAmount - numberAsString.length; i++) { result += "0"; }
    return result + number;
}

/** Generates the values of the grids in the grid table to be solved. */
function GenerateGridTablePuzzle() {
    GenerateGridTablePattern();
    ToggleTimer(true);

    HINT_BUTTON.setAttribute("popUpInfo", AvailableHintCount = MAXIMUM_HINT_COUNT);
    if (CurrentDifficulty == "Creation") { HINT_BUTTON.setAttribute("disabled", ""); }

    TIMER_TOGGLE_BUTTON.removeAttribute("disabled");
    NEW_PUZZLE_BUTTON.setAttribute("hidden", "");
    SOLVE_PUZZLE_BUTTON.removeAttribute("hidden");

    GRID_TABLE_ELEMENT.removeAttribute("settingUp");
}

/** Calculates the amount of grids is gonna be generated depending on the given difficulty. */
function CalculateGridGeneratingAmount() {
    return Math.max(GRID_MINIMUM_AMOUNT,
        UPPER_DIMENSIONS * DIFFICULTIES[CurrentDifficulty] + ~~(Math.random() * (UPPER_DIMENSIONS * GRID_VARIETY_RANGE + 1)));
}

/** Generates the values of the grids in the grid table in a solved pattern. */
function GenerateGridTablePattern() {
    EliminatedGrids = [];

    if (CurrentDifficulty == "Creation") {
        Grids.flat().forEach(grid => {
            SetGridValue(grid);
            grid.generated = false;
            grid.element.classList.remove("generated");
        });
        return;
    }

    for (let i = 0, iOffset = 0; i < UPPER_DIMENSIONS; i++) {
        if (i && i % DIMENSIONS == 0) { iOffset++; }

        for (let j = 0; j < UPPER_DIMENSIONS; j++) {
            let value = (i * DIMENSIONS + j) % UPPER_DIMENSIONS + 1;

            value = (value + iOffset - 1) % UPPER_DIMENSIONS;

            Grids[i][j].element.firstChild.innerText = Grids[i][j].value = DIGITS[value];
        }
    }

    ShuffleGridTable("columns");
    ShuffleGridTable("rows");
    ShuffleGridTable("digits");

    EliminateGrids();
}

/** Eliminates grids from the grid table to form a new puzzle. */
function EliminateGrids() {
    const GRID_GENERATING_AMOUNT = CalculateGridGeneratingAmount();

    for (let x = 0; x < UPPER_DIMENSIONS * UPPER_DIMENSIONS - GRID_GENERATING_AMOUNT; x++) {
        let i = ~~(Math.random() * UPPER_DIMENSIONS),
            j = ~~(Math.random() * UPPER_DIMENSIONS);

        if (!Grids[i][j].generated) { x--; continue; }

        EliminatedGrids.push({ ...Grids[i][j] });

        SetGridValue(Grids[i][j]);
        Grids[i][j].generated = false;
        Grids[i][j].element.classList.remove("generated");
    }
}

/** Shuffles the grids in the grid table.
 * @param {"columns" | "rows" | "digits" } shufflingCase Determines the way the grids in the grid table will be shuffled.
 */
function ShuffleGridTable(shufflingCase) {
    switch (shufflingCase) {
        case SCANNING_CASE.Columns:
        case SCANNING_CASE.Rows:
            ShuffleColumnsOrRows(shufflingCase);
            break;
        case SCANNING_CASE.Digits: ShuffleDigits(); break;
    }
}

/** Shuffles the columns or rows of grids in the grid table.
 * @param {"columns" | "rows" } shufflingCase Determines the way the grids in the grid table will be shuffled.
 */
function ShuffleColumnsOrRows(shufflingCase) {
    if (!["columns", "rows"].includes(shufflingCase)) { return; }

    for (let i = 0; i < DIMENSIONS; i++) {
        let indices = Array(DIMENSIONS)
            .fill(0)
            .map((_, i) => i)
            .sort((_, __) => 0.5 - Math.random());

        let swapped = new Set();

        for (let j = 0; j < DIMENSIONS; j++) {
            if (indices[j] == j || (swapped.has(j) && swapped.has(indices[j]))) { continue; }

            swapped.add(j);
            swapped.add(indices[j]);

            for (let k = 0; k < UPPER_DIMENSIONS; k++) {
                let grid1 = shufflingCase == SCANNING_CASE.Columns ?
                    Grids[k][j + i * DIMENSIONS] :
                    Grids[j + i * DIMENSIONS][k];

                let grid2 = shufflingCase == SCANNING_CASE.Columns ?
                    Grids[k][indices[j] + i * DIMENSIONS] :
                    Grids[indices[j] + i * DIMENSIONS][k];

                SwapGrids(grid1, grid2);
            }
        }
    }
}

/** Shuffles all the digits within every grid individually in the grid table. */
function ShuffleDigits() {
    let digits = [...DIGITS],
        flattenedGrids = Grids.flat();

    while (digits.length) {
        let digit1 = digits[~~(Math.random() * digits.length)];
        digits = digits.filter(digit => digit != digit1);

        if (!digits.length) { break; }
        let digit2 = digits[~~(Math.random() * digits.length)];
        digits = digits.filter(digit => digit != digit2);

        let grids1 = flattenedGrids.filter(grid => grid.value == digit1),
            grids2 = flattenedGrids.filter(grid => grid.value == digit2);

        grids1.forEach(grid => SetGridValue(grid, digit2));
        grids2.forEach(grid => SetGridValue(grid, digit1));
    }
}

/** Swaps two grids values.
 * @param {Object} grid1 The first grid.
 * @param {HTMLElement} grid1.element
 * @param {Number} grid1.value
 * @param {Number} grid1.i
 * @param {Number} grid1.j
 * @param {Boolean} grid1.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid1.subGrids
 * @param {Object} grid2 The first grid.
 * @param {HTMLElement} grid2.element
 * @param {Number} grid2.value
 * @param {Number} grid2.i
 * @param {Number} grid2.j
 * @param {Boolean} grid2.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid2.subGrids
 */
function SwapGrids(grid1, grid2) {
    let temporaryValue = grid1.value;
    grid1.value = grid2.value;
    grid2.value = temporaryValue;

    let temporaryInnerText = grid1.element.firstChild.innerText;
    grid1.element.firstChild.innerText = grid2.element.firstChild.innerText;
    grid2.element.firstChild.innerText = temporaryInnerText;
}

/** Gets the square that a grid is contained within.
 * @param {Object} grid The selected grid.
 * @param {HTMLElement} grid.element
 * @param {String} grid.value
 * @param {Number} grid.i
 * @param {Number} grid.j
 * @param {Boolean} grid.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid.subGrids
 * @returns The square that contains the grid that has the given indices.
 */
function GetGridSquare(grid) {
    let i = ~~(grid.i / DIMENSIONS) + ~~(grid.j / UPPER_DIMENSIONS),
        j = ~~(grid.i / UPPER_DIMENSIONS) + ~~(grid.j / DIMENSIONS);
    return Squares[i][j];
}

/** Generates sub grids among all the grid table to indicate what's left. */
function GenerateSubGrids() { Grids.flat().forEach(grid => grid.subGrids.forEach((_, i) => UpdateSubGrid(grid, i, false))); }

/** Updates only the existing sub grids of a grid to indicate what's left.
 * @param {Object} grid The grid parent of the sub grid.
 * @param {HTMLElement} grid.element
 * @param {String} grid.value
 * @param {Number} grid.i
 * @param {Number} grid.j
 * @param {Boolean} grid.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid.subGrids
 * @param all Determines whether or not to update all sub grids.
 */
function UpdateExistingSubGridsOfGrid(grid, all = false) {
    grid.subGrids.forEach(subGrid => SetGridValue(subGrid, null, true));

    GetGridSquare(grid).grids.forEach(grid_ => grid_.subGrids.forEach((_, i) => UpdateSubGrid(grid_, i, !all)));

    ForEachNeighbourGrid(grid,
        neighbourGrid => neighbourGrid.subGrids.forEach((_, i) => UpdateSubGrid(neighbourGrid, i, !all)));
}

/** Updates a sub grid value according to its parent grid.
 * @param {Object} grid The grid parent of the sub grid.
 * @param {HTMLElement} grid.element
 * @param {String} grid.value
 * @param {Number} grid.i
 * @param {Number} grid.j
 * @param {Boolean} grid.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid.subGrids
 * @param {Number} i The index in which the sub grid is contained within the grid.
 * @param {Boolean} onlyPreExisting Determines whether or not to update only the previously existing sub grids.
 */
function UpdateSubGrid(grid, i, onlyPreExisting = true) {
    if (onlyPreExisting && grid.subGrids[i].value == -1) { return; }

    SetGridValue(grid.subGrids[i], null, true);

    if (grid.value != -1 || ValidateSubGridValue(grid, DIGITS[i])) { return; }

    SetGridValue(grid.subGrids[i], DIGITS[i], true);
}

/** Checks if a value of a sub grid is valid, according to its grid parent.
 * @param {Object} grid The grid parent of the sub grid.
 * @param {HTMLElement} grid.element
 * @param {String} grid.value
 * @param {Number} grid.i
 * @param {Number} grid.j
 * @param {Boolean} grid.generated
 * @param {Array<{
 *      gridElement: HTMLElement,
 *      value: String, 
 *      i: Number, 
 *      j: Number, 
 * }>} grid.subGrids
 * @param {String} value The value of the sub grid to be validated.
 * @returns A boolean value representing whether or not the sub grid is valid to be put.
 */
function ValidateSubGridValue(grid, value) {
    if (GetGridSquare(grid).grids.some(grid_ => grid_.value == value)) { return true; }

    let valueExists = false;
    ForEachNeighbourGrid(grid, neighbourGrid => valueExists |= neighbourGrid.value == value);

    return valueExists;
}

/** Validates the grid table by checking if placed grid values aren't broken. */
function ValidateGridTable() {
    let squareSet = new Set(),
        columnSet = new Set(),
        rowSet = new Set(),
        areSquaresValid = true;

    Squares.flat().forEach(square => {
        squareSet.clear();
        square.grids.forEach(grid => {
            if (grid.value == -1) { return; }

            let previousSize = squareSet.size;
            squareSet.add(grid.value);

            areSquaresValid &= previousSize != squareSet.size;
        });
    });
    if (!areSquaresValid) { return false; }

    for (let x = 0; x < UPPER_DIMENSIONS; x++) {
        columnSet.clear();

        for (let j = 0; j < UPPER_DIMENSIONS; j++) {
            if (Grids[x][j].value == -1) { continue; }

            let previousSize = columnSet.size;
            columnSet.add(Grids[x][j].value);

            if (previousSize == columnSet.size) { return false; }
        }
    }

    for (let x = 0; x < UPPER_DIMENSIONS; x++) {
        rowSet.clear();

        for (let i = 0; i < UPPER_DIMENSIONS; i++) {
            if (Grids[i][x].value == -1) { continue; }

            let previousSize = rowSet.size;
            rowSet.add(Grids[i][x].value);

            if (previousSize == rowSet.size) { return false; }
        }
    }

    return true;
}

/** Solves the grid table and toggles the option to a new puzzle. */
function SolveGridTablePuzzle() {
    if (CurrentDifficulty == "Creation" && !ValidateGridTable()) { alert("Unsolvable Pattern."); return; }

    SolveGridTable();
    ToggleTimer();

    TIMER_TOGGLE_BUTTON.setAttribute("disabled", "");

    NEW_PUZZLE_BUTTON.removeAttribute("hidden");
    NEW_PUZZLE_BUTTON.setAttribute("disabled", "");

    SOLVE_PUZZLE_BUTTON.setAttribute("hidden", "");
}

/** Solves the grid table. */
function SolveGridTable() {
    let emptyGrids = Grids.flat().filter(grid => CurrentDifficulty != "Creation" ? !grid.generated : grid.value == -1);

    emptyGrids.forEach(emptyGrid => {
        if (emptyGrid.value == -1) { return; }

        SetGridValue(emptyGrid);
        emptyGrid.generated = false;
    });

    GenerateSubGrids();

    let solvedGridCount = 0;
    let solvingIntervalID = setInterval(() => {
        let currentSolvedGridCount = 0;

        Squares.flat().forEach(square => {
            currentSolvedGridCount = SolveNakedGridsInSquare(square, currentSolvedGridCount);

            SolveHiddenGridsInSquare(square);
        });

        for (let i = 0; i < UPPER_DIMENSIONS; i++) {
            SolveHiddenGridsInColumnOrRow("columns", i);
            SolveHiddenGridsInColumnOrRow("rows", i);
        }

        if (solvedGridCount == currentSolvedGridCount) {
            SolveUsingBackTracking();

            clearInterval(solvingIntervalID);
            return;
        }

        solvedGridCount = currentSolvedGridCount;

        if (currentSolvedGridCount >= UPPER_DIMENSIONS * UPPER_DIMENSIONS) {
            clearInterval(solvingIntervalID);
            NEW_PUZZLE_BUTTON.removeAttribute("disabled");
        }
    });
}

/** Solves all naked grids within a specified square, (naked grids are grids that can only
 * be put in one place and they're too obvious to notice).
 * @param {Object} square The selected square that its naked grids will be solved.
 * @param {HTMLElement} square.element
 * @param {Array<{
 *      element: HTMLElement,
 *      value: String,
 *      i: Number,
 *      j: Number,
 *      subGrids: Array<{
 *          gridElement: HTMLElement,
 *          value: String, 
 *          i: Number, 
 *          j: Number, 
 *      }>
 * }>} square.grids
 * @param {Number} square.i
 * @param {Number} square.j
 * @param {Number} solvedGridCount The current amount of solved grids there are, hence increasing it.
 * @returns The new solved grid count.
 */
function SolveNakedGridsInSquare(square, solvedGridCount) {
    square.grids.forEach(grid => {
        if (grid.value != -1) { solvedGridCount++; return; }

        let gridOdds = grid.subGrids.filter(subGrid => subGrid.value != -1).length;

        if (gridOdds > 1) { return; }

        let onlySubGrid = grid.subGrids.find(subGrid => subGrid.value != -1);

        SetGridValue(grid, onlySubGrid.value);
        UpdateExistingSubGridsOfGrid(grid);
    });

    return solvedGridCount;
}

/** Solves all hiddent grids within a specified square, (hidden grids are grids that contain only one occurance of a
 * certain digit within the specified square).
 * @param {Object} square The selected square that its hidden grids will be solved.
 * @param {HTMLElement} square.element
 * @param {Array<{
 *      element: HTMLElement,
 *      value: String,
 *      i: Number,
 *      j: Number,
 *      subGrids: Array<{
 *          gridElement: HTMLElement,
 *          value: String, 
 *          i: Number, 
 *          j: Number, 
 *      }>
 * }>} square.grids
 * @param {Number} square.i
 * @param {Number} square.j
 */
function SolveHiddenGridsInSquare(square) {
    let digitOccurances = [...DIGITS].map(digit => {
        let digitOccurance = {
            digit: digit,
            occurances: [{
                i: -1,
                j: -1,
            }],
        };
        digitOccurance.occurances = [];
        return digitOccurance;
    });

    square.grids.forEach(grid => grid.subGrids.forEach(
        (subGrid, i) => {
            if (subGrid.value == -1) { return; }
            digitOccurances[i].occurances.push({ i: grid.i, j: grid.j });
        }));

    digitOccurances.forEach(digitOccurance => {
        EliminateSubGridsFromRowOrColumn("columns", square, digitOccurance);
        EliminateSubGridsFromRowOrColumn("rows", square, digitOccurance);
    });

    let assuredDigitOccurance = digitOccurances.find(
        digitOccurance => digitOccurance.occurances.length == 1);

    if (!assuredDigitOccurance) { return; }

    let matchGrid = square.grids.find(
        grid => grid.subGrids.find(subGrid => subGrid.value == assuredDigitOccurance.digit));

    if (!matchGrid) { return; }

    SetGridValue(matchGrid, assuredDigitOccurance.digit);
    UpdateExistingSubGridsOfGrid(matchGrid);
}

/** Checks if a digit occured only on a row or column, to eliminate its other occurances on sub grids.
 * @param {"columns" | "rows"} eliminationCase Determines the way the elimination will be.
 * @param {Object} square The square that is been searched within.
 * @param {HTMLElement} square.element
 * @param {Array<{
 *      element: HTMLElement,
 *      value: String,
 *      i: Number,
 *      j: Number,
 *      subGrids: Array<{
 *          gridElement: HTMLElement,
 *          value: String, 
 *          i: Number, 
 *          j: Number, 
 *      }>
 * }>} square.grids
 * @param {Number} square.i
 * @param {Number} square.j
 * @param {{
 *      digit: Number,
 *      occurances: Array<{
 *          i: Number,
 *          j: Number,
 *      }>
 * }} digitOccurance The digit and its all occurances among the grid table.
 */
function EliminateSubGridsFromRowOrColumn(eliminationCase, square, digitOccurance) {
    if (!["columns", "rows"].includes(eliminationCase) || !digitOccurance.occurances.length) { return; }

    let areAllNextToEachOther = !digitOccurance.occurances.some(occurance =>
        (eliminationCase == SCANNING_CASE.Columns && occurance.j != digitOccurance.occurances[0].j) ||
        (eliminationCase == SCANNING_CASE.Rows && occurance.i != digitOccurance.occurances[0].i)
    );

    if (!areAllNextToEachOther) { return; }

    for (let x = 0; x < UPPER_DIMENSIONS; x++) {
        let grid = eliminationCase == SCANNING_CASE.Columns ?
            Grids[x][digitOccurance.occurances[0].j] :
            Grids[digitOccurance.occurances[0].i][x];

        let square_ = GetGridSquare(grid);

        if (square.i == square_.i && square.j == square_.j) { continue; }

        grid.subGrids.forEach(subGrid => {
            if (subGrid.value != digitOccurance.digit) { return; }
            SetGridValue(subGrid, null, true);
        });
    }
}

/** Solves all hiddent grids within a specified column or row, (hidden grids are grids that contain only one
 * occurance of a certain digit within the specified column or row).
 * @param {"columns" | "rows"} solvingCase Determines the way the solving will be.
 * @param {Number} i The index in which the column or row are contained within the grid table.
 */
function SolveHiddenGridsInColumnOrRow(solvingCase, i) {
    if (!["columns", "rows"].includes(solvingCase)) { return; }

    let digitOccurances = [...DIGITS].map(digit => {
        return {
            digit: digit,
            occurance: 0,
        };
    });

    for (let x = 0; x < UPPER_DIMENSIONS; x++) {
        let grid = solvingCase == SCANNING_CASE.Columns ?
            Grids[x][i] : Grids[i][x];

        grid.subGrids.forEach((subGrid, i) => digitOccurances[i].occurance += subGrid.value != -1);
    }

    let assuredDigitOccurance = digitOccurances.find(digitOccurance => digitOccurance.occurance == 1);
    if (!assuredDigitOccurance) { return; }

    let matchGrid;
    for (let x = 0; x < UPPER_DIMENSIONS; x++) {
        let grid = solvingCase == SCANNING_CASE.Columns ?
            Grids[x][i] : Grids[i][x];

        if (grid.subGrids.find(subGrid => subGrid.value == assuredDigitOccurance.digit)) { matchGrid = grid; break; }
    }

    if (!matchGrid) { return; }

    SetGridValue(matchGrid, assuredDigitOccurance.digit);
    UpdateExistingSubGridsOfGrid(matchGrid);
}

/** Solves the grid table using back tracking algorithm. */
function SolveUsingBackTracking(callback = null) {
    let emptyGrids = Grids.flat().filter(grid => CurrentDifficulty != "Creation" ? !grid.generated : grid.value == -1);

    if (!emptyGrids.length) { NEW_PUZZLE_BUTTON.removeAttribute("disabled"); callback?.call(); return; }

    let isBackTracking = false, i = 0;
    let backTrackingIntervalID = setInterval(() => {
        let previousGridValue = -1;
        if (isBackTracking) { previousGridValue = emptyGrids[i].value; SetGridValue(emptyGrids[i]); }
        UpdateExistingSubGridsOfGrid(emptyGrids[i], true);

        let firstSubGrid = emptyGrids[i].subGrids.find(subGrid => {
            if (isBackTracking && DIGITS.indexOf(subGrid.value) <= DIGITS.indexOf(previousGridValue)) { return false; }
            return subGrid.value != -1;
        });

        if (!firstSubGrid) {
            if (!i--) {
                clearInterval(backTrackingIntervalID);
                NEW_PUZZLE_BUTTON.removeAttribute("disabled");
                return;
            }

            isBackTracking = true;
            return;
        }

        SetGridValue(emptyGrids[i], firstSubGrid.value);
        isBackTracking = false;

        if (++i >= emptyGrids.length) {
            UpdateExistingSubGridsOfGrid(emptyGrids[i - 1]);
            clearInterval(backTrackingIntervalID);
            NEW_PUZZLE_BUTTON.removeAttribute("disabled");
        }
    });
}