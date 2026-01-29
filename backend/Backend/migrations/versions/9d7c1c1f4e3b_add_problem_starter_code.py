"""Add problem starter code

Revision ID: 9d7c1c1f4e3b
Revises: 8f4d1c2a7b10
Create Date: 2026-01-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9d7c1c1f4e3b"
down_revision: Union[str, None] = "8f4d1c2a7b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _starter_code_for(title: str) -> dict:
    title_lower = (title or "").lower()

    if "sum of two numbers" in title_lower:
        return {
            "javascript": "function solve(input) {\n  const [a, b] = input.trim().split(/\\s+/).map(Number);\n  console.log(a + b);\n}\n\nsolve(require('fs').readFileSync(0, 'utf8'));\n",
            "python": "def solve(data: str):\n    a, b = map(int, data.strip().split())\n    print(a + b)\n\nif __name__ == '__main__':\n    import sys\n    solve(sys.stdin.read())\n",
            "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        Scanner sc = new Scanner(System.in);\n        long a = sc.nextLong();\n        long b = sc.nextLong();\n        System.out.println(a + b);\n        sc.close();\n    }\n}\n",
            "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    long long a, b;\n    if (!(cin >> a >> b)) return 0;\n    cout << (a + b);\n    return 0;\n}\n",
        }

    if "valid parentheses" in title_lower:
        return {
            "javascript": "function solve(input) {\n  const s = input.trim();\n  const stack = [];\n  const pairs = { ')': '(', ']': '[', '}': '{' };\n  for (const ch of s) {\n    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);\n    else {\n      if (!stack.length || stack.pop() !== pairs[ch]) {\n        console.log('false');\n        return;\n      }\n    }\n  }\n  console.log(stack.length === 0 ? 'true' : 'false');\n}\n\nsolve(require('fs').readFileSync(0, 'utf8'));\n",
            "python": "def solve(data: str):\n    s = data.strip()\n    stack = []\n    pairs = {')': '(', ']': '[', '}': '{'}\n    for ch in s:\n        if ch in \"([{\":\n            stack.append(ch)\n        else:\n            if not stack or stack.pop() != pairs.get(ch):\n                print('false')\n                return\n    print('true' if not stack else 'false')\n\nif __name__ == '__main__':\n    import sys\n    solve(sys.stdin.read())\n",
            "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        String s = br.readLine();\n        if (s == null) return;\n        Deque<Character> stack = new ArrayDeque<>();\n        Map<Character, Character> pairs = Map.of(')', '(', ']', '[', '}', '{');\n        for (char ch : s.toCharArray()) {\n            if (ch == '(' || ch == '[' || ch == '{') {\n                stack.push(ch);\n            } else {\n                if (stack.isEmpty() || stack.pop() != pairs.get(ch)) {\n                    System.out.println(\"false\");\n                    return;\n                }\n            }\n        }\n        System.out.println(stack.isEmpty() ? \"true\" : \"false\");\n    }\n}\n",
            "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    string s;\n    if (!getline(cin, s)) return 0;\n    vector<char> st;\n    unordered_map<char, char> pairs{{')','('},{']','['},{'}','{'}};\n    for (char ch : s) {\n        if (ch == '(' || ch == '[' || ch == '{') st.push_back(ch);\n        else {\n            if (st.empty() || st.back() != pairs[ch]) {\n                cout << \"false\";\n                return 0;\n            }\n            st.pop_back();\n        }\n    }\n    cout << (st.empty() ? \"true\" : \"false\");\n    return 0;\n}\n",
        }

    return {
        "javascript": "function solve(input) {\n  // TODO: implement\n}\n\nsolve(require('fs').readFileSync(0, 'utf8'));\n",
        "python": "def solve(data: str):\n    # TODO: implement\n    pass\n\nif __name__ == '__main__':\n    import sys\n    solve(sys.stdin.read())\n",
        "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        // TODO: implement\n    }\n}\n",
        "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // TODO: implement\n    return 0;\n}\n",
    }


def upgrade() -> None:
    op.create_table(
        "problem_starter_code",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("problem_id", "language", name="uq_problem_language"),
    )

    conn = op.get_bind()
    problems = conn.execute(sa.text("SELECT id, title FROM problems")).fetchall()
    for problem_id, title in problems:
        existing = conn.execute(
            sa.text("SELECT COUNT(*) FROM problem_starter_code WHERE problem_id = :pid"),
            {"pid": problem_id},
        ).scalar() or 0
        if existing:
            continue
        codes = _starter_code_for(title)
        for language, code in codes.items():
            conn.execute(
                sa.text(
                    """
                    INSERT INTO problem_starter_code (problem_id, language, code)
                    VALUES (:pid, :language, :code)
                    """
                ),
                {"pid": problem_id, "language": language, "code": code},
            )


def downgrade() -> None:
    op.drop_table("problem_starter_code")
