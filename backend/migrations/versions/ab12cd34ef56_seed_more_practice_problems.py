"""Seed more practice problems

Revision ID: ab12cd34ef56
Revises: a7c8d9e0f1a2
Create Date: 2026-03-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "ab12cd34ef56"
down_revision: Union[str, None] = "a7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _starter_codes() -> dict[str, str]:
    return {
        "javascript": (
            "function solve(input) {\n"
            "  // TODO: parse input and print the answer\n"
            "}\n\n"
            "solve(require('fs').readFileSync(0, 'utf8'));\n"
        ),
        "python": (
            "def solve(data: str):\n"
            "    # TODO: parse input and print the answer\n"
            "    pass\n\n"
            "if __name__ == '__main__':\n"
            "    import sys\n"
            "    solve(sys.stdin.read())\n"
        ),
        "java": (
            "import java.io.*;\n"
            "import java.util.*;\n\n"
            "public class Main {\n"
            "    public static void main(String[] args) throws Exception {\n"
            "        // TODO: implement\n"
            "    }\n"
            "}\n"
        ),
        "cpp": (
            "#include <bits/stdc++.h>\n"
            "using namespace std;\n\n"
            "int main() {\n"
            "    // TODO: implement\n"
            "    return 0;\n"
            "}\n"
        ),
        "algo": (
            "algorithme solve\n\n"
            "variables\n"
            "    // TODO: declare variables\n\n"
            "debut\n"
            "    // TODO: implement\n"
            "fin\n"
        ),
    }


PROBLEMS = [
    {
        "title": "Find the Index of the First Occurrence in a String",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/description/",
        "description": (
            "Given two strings haystack and needle, return the starting index of the first occurrence "
            "of needle in haystack. Return -1 if needle does not occur in haystack.\n\n"
            "Input:\n"
            "Line 1: haystack\n"
            "Line 2: needle\n\n"
            "Output:\n"
            "A single integer index."
        ),
        "constraints": "1 <= needle.length <= haystack.length <= 10^4",
        "test_cases": [
            ("sadbutsad\nsad", "0", True, 0),
            ("leetcode\nleeto", "-1", True, 1),
            ("mississippi\nissip", "4", True, 2),
            ("aaaaa\nbba", "-1", False, 3),
            ("abc\nc", "2", False, 4),
            ("abcabcabc\ncab", "2", False, 5),
        ],
    },
    {
        "title": "Plus One",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/plus-one/description/",
        "description": (
            "You are given a non-empty array of decimal digits representing a non-negative integer. "
            "Add one to the integer and return the resulting digits.\n\n"
            "Input:\n"
            "Line 1: n, the number of digits\n"
            "Line 2: n space-separated digits\n\n"
            "Output:\n"
            "The resulting digits separated by spaces."
        ),
        "constraints": "1 <= n <= 100; each digit is between 0 and 9",
        "test_cases": [
            ("3\n1 2 3", "1 2 4", True, 0),
            ("4\n4 3 2 1", "4 3 2 2", True, 1),
            ("1\n9", "1 0", True, 2),
            ("3\n9 9 9", "1 0 0 0", False, 3),
            ("1\n0", "1", False, 4),
            ("5\n2 9 9 9 9", "3 0 0 0 0", False, 5),
        ],
    },
    {
        "title": "Roman to Integer",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/roman-to-integer/description/",
        "description": (
            "Convert a Roman numeral string into its integer value.\n\n"
            "Input:\n"
            "Line 1: a Roman numeral string s\n\n"
            "Output:\n"
            "A single integer."
        ),
        "constraints": "1 <= s.length <= 15; s is a valid Roman numeral in the range [1, 3999]",
        "test_cases": [
            ("III", "3", True, 0),
            ("LVIII", "58", True, 1),
            ("MCMXCIV", "1994", True, 2),
            ("XL", "40", False, 3),
            ("CDXLIV", "444", False, 4),
            ("MMMCMXCIX", "3999", False, 5),
        ],
    },
    {
        "title": "Arranging Coins",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/arranging-coins/description/",
        "description": (
            "You have n coins and want to build a staircase with complete rows. "
            "Return the number of complete rows you can form.\n\n"
            "Input:\n"
            "Line 1: integer n\n\n"
            "Output:\n"
            "A single integer."
        ),
        "constraints": "0 <= n <= 2^31 - 1",
        "test_cases": [
            ("5", "2", True, 0),
            ("8", "3", True, 1),
            ("1", "1", True, 2),
            ("0", "0", False, 3),
            ("3", "2", False, 4),
            ("1804289383", "60070", False, 5),
        ],
    },
    {
        "title": "Max Consecutive Ones",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/max-consecutive-ones/description/",
        "description": (
            "Given a binary array nums, return the maximum number of consecutive 1s in the array.\n\n"
            "Input:\n"
            "Line 1: n, the array length\n"
            "Line 2: n space-separated values, each 0 or 1\n\n"
            "Output:\n"
            "A single integer."
        ),
        "constraints": "1 <= n <= 10^5; nums[i] is 0 or 1",
        "test_cases": [
            ("6\n1 1 0 1 1 1", "3", True, 0),
            ("6\n1 0 1 1 0 1", "2", True, 1),
            ("5\n0 0 0 0 0", "0", True, 2),
            ("5\n1 1 1 1 1", "5", False, 3),
            ("8\n0 1 1 1 0 1 1 0", "3", False, 4),
            ("1\n1", "1", False, 5),
        ],
    },
    {
        "title": "Relative Ranks",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/relative-ranks/description/",
        "description": (
            "Given distinct athlete scores, rank them from highest to lowest. "
            "The top three receive Gold Medal, Silver Medal, and Bronze Medal. "
            "All others receive their numeric rank.\n\n"
            "Input:\n"
            "Line 1: n, the number of athletes\n"
            "Line 2: n distinct space-separated scores\n\n"
            "Output:\n"
            "n lines, one rank string per athlete in the original order."
        ),
        "constraints": "1 <= n <= 10^4; scores are distinct",
        "test_cases": [
            ("5\n5 4 3 2 1", "Gold Medal\nSilver Medal\nBronze Medal\n4\n5", True, 0),
            ("5\n10 3 8 9 4", "Gold Medal\n5\nBronze Medal\nSilver Medal\n4", True, 1),
            ("1\n99", "Gold Medal", True, 2),
            ("4\n100 90 80 70", "Gold Medal\nSilver Medal\nBronze Medal\n4", False, 3),
            ("6\n60 50 40 30 20 10", "Gold Medal\nSilver Medal\nBronze Medal\n4\n5\n6", False, 4),
            ("3\n2 3 1", "Silver Medal\nGold Medal\nBronze Medal", False, 5),
        ],
    },
    {
        "title": "Construct the Rectangle",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/construct-the-rectangle/description/",
        "description": (
            "Given an area, find integers L and W such that L * W = area, L >= W, "
            "and L - W is as small as possible.\n\n"
            "Input:\n"
            "Line 1: integer area\n\n"
            "Output:\n"
            "Two integers: L and W separated by a space."
        ),
        "constraints": "1 <= area <= 10^7",
        "test_cases": [
            ("4", "2 2", True, 0),
            ("37", "37 1", True, 1),
            ("122122", "427 286", True, 2),
            ("1", "1 1", False, 3),
            ("36", "6 6", False, 4),
            ("48", "8 6", False, 5),
        ],
    },
    {
        "title": "Detect Capital",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/detect-capital/description/",
        "description": (
            "Return true if the capitalization of the word is valid. Valid patterns are: "
            "all letters uppercase, all letters lowercase, or only the first letter uppercase.\n\n"
            "Input:\n"
            "Line 1: word\n\n"
            "Output:\n"
            "true or false"
        ),
        "constraints": "1 <= word.length <= 100",
        "test_cases": [
            ("USA", "true", True, 0),
            ("FlaG", "false", True, 1),
            ("Google", "true", True, 2),
            ("leetcode", "true", False, 3),
            ("mL", "false", False, 4),
            ("A", "true", False, 5),
        ],
    },
    {
        "title": "Reshape the Matrix",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/reshape-the-matrix/description/",
        "description": (
            "Reshape a matrix into dimensions r by c while preserving row-traversal order. "
            "If reshape is impossible, return the original matrix.\n\n"
            "Input:\n"
            "Line 1: m n r c\n"
            "Next m lines: n space-separated integers\n\n"
            "Output:\n"
            "Print the resulting matrix, one row per line, values space-separated."
        ),
        "constraints": "1 <= m, n <= 100; matrix size is unchanged during reshape",
        "test_cases": [
            ("2 2 1 4\n1 2\n3 4", "1 2 3 4", True, 0),
            ("2 2 2 4\n1 2\n3 4", "1 2\n3 4", True, 1),
            ("2 3 3 2\n1 2 3\n4 5 6", "1 2\n3 4\n5 6", True, 2),
            ("1 4 2 2\n1 2 3 4", "1 2\n3 4", False, 3),
            ("3 1 1 3\n1\n2\n3", "1 2 3", False, 4),
            ("2 3 4 2\n1 2 3\n4 5 6", "1 2 3\n4 5 6", False, 5),
        ],
    },
    {
        "title": "Array Partition",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/array-partition/description/",
        "description": (
            "Given 2n integers, group them into n pairs so that the sum of the minimum of each pair is maximized. "
            "Return that maximum sum.\n\n"
            "Input:\n"
            "Line 1: n, the number of pairs\n"
            "Line 2: 2n space-separated integers\n\n"
            "Output:\n"
            "A single integer."
        ),
        "constraints": "1 <= n <= 10^4; there are exactly 2n integers",
        "test_cases": [
            ("2\n1 4 3 2", "4", True, 0),
            ("3\n6 2 6 5 1 2", "9", True, 1),
            ("1\n7 3", "3", True, 2),
            ("2\n-1 -2 -3 -4", "-6", False, 3),
            ("3\n1 1 1 1 1 1", "3", False, 4),
            ("4\n9 8 7 6 5 4 3 2", "20", False, 5),
        ],
    },
    {
        "title": "Minimum Changes to Make Alternating Binary String",
        "difficulty": "Easy",
        "external_link": "https://leetcode.com/problems/minimum-changes-to-make-alternating-binary-string/description/",
        "description": (
            "Given a binary string s, return the minimum number of character changes needed to make it alternating.\n\n"
            "Input:\n"
            "Line 1: binary string s\n\n"
            "Output:\n"
            "A single integer."
        ),
        "constraints": "1 <= s.length <= 10^5; s contains only '0' and '1'",
        "test_cases": [
            ("0100", "1", True, 0),
            ("10", "0", True, 1),
            ("1111", "2", True, 2),
            ("0000", "2", False, 3),
            ("1", "0", False, 4),
            ("10010100", "3", False, 5),
        ],
    },
]


def _upsert_problem(conn, problem: dict) -> int:
    row = conn.execute(
        sa.text("SELECT id FROM problems WHERE title = :title LIMIT 1"),
        {"title": problem["title"]},
    ).fetchone()

    if row:
        problem_id = row[0]
        conn.execute(
            sa.text(
                """
                UPDATE problems
                SET difficulty = :difficulty,
                    external_link = :external_link,
                    description = :description,
                    constraints = :constraints
                WHERE id = :id
                """
            ),
            {
                "id": problem_id,
                "difficulty": problem["difficulty"],
                "external_link": problem["external_link"],
                "description": problem["description"],
                "constraints": problem["constraints"],
            },
        )
        return problem_id

    conn.execute(
        sa.text(
            """
            INSERT INTO problems (title, difficulty, external_link, description, constraints)
            VALUES (:title, :difficulty, :external_link, :description, :constraints)
            """
        ),
        {
            "title": problem["title"],
            "difficulty": problem["difficulty"],
            "external_link": problem["external_link"],
            "description": problem["description"],
            "constraints": problem["constraints"],
        },
    )
    return conn.execute(
        sa.text("SELECT id FROM problems WHERE title = :title LIMIT 1"),
        {"title": problem["title"]},
    ).scalar_one()


def _replace_test_cases(conn, problem_id: int, test_cases: list[tuple[str, str, bool, int]]) -> None:
    conn.execute(
        sa.text("DELETE FROM problem_test_cases WHERE problem_id = :problem_id"),
        {"problem_id": problem_id},
    )
    for input_text, output_text, is_sample, order in test_cases:
        conn.execute(
            sa.text(
                """
                INSERT INTO problem_test_cases (problem_id, input_text, output_text, is_sample, "order")
                VALUES (:problem_id, :input_text, :output_text, :is_sample, :order)
                """
            ),
            {
                "problem_id": problem_id,
                "input_text": input_text,
                "output_text": output_text,
                "is_sample": is_sample,
                "order": order,
            },
        )


def _ensure_starter_codes(conn, problem_id: int) -> None:
    for language, code in _starter_codes().items():
        existing = conn.execute(
            sa.text(
                """
                SELECT id
                FROM problem_starter_code
                WHERE problem_id = :problem_id AND language = :language
                LIMIT 1
                """
            ),
            {"problem_id": problem_id, "language": language},
        ).fetchone()
        if existing:
            conn.execute(
                sa.text(
                    """
                    UPDATE problem_starter_code
                    SET code = :code
                    WHERE id = :id
                    """
                ),
                {"id": existing[0], "code": code},
            )
        else:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO problem_starter_code (problem_id, language, code)
                    VALUES (:problem_id, :language, :code)
                    """
                ),
                {"problem_id": problem_id, "language": language, "code": code},
            )


def upgrade() -> None:
    conn = op.get_bind()

    for problem in PROBLEMS:
        problem_id = _upsert_problem(conn, problem)
        _replace_test_cases(conn, problem_id, problem["test_cases"])
        _ensure_starter_codes(conn, problem_id)


def downgrade() -> None:
    # Do not remove seeded content during downgrade to avoid accidental data loss.
    pass
