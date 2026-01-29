from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import Query
from schemas import *
from app.models import *
from database import get_db
from app.controllers.auth import get_current_user
from sqlalchemy import func
from datetime import datetime

router = APIRouter()

def serialize_problem(problem: Problem) -> ProblemOut:
    test_cases = []
    if problem.test_cases:
        test_cases = [
            ProblemTestCaseOut(
                id=tc.id,
                input_text=tc.input_text,
                output_text=tc.output_text,
                is_sample=tc.is_sample,
                order=tc.order,
            )
            for tc in sorted(problem.test_cases, key=lambda t: t.order)
            if tc.is_sample
        ]
    starter_codes = []
    if problem.starter_codes:
        starter_codes = [
            ProblemStarterCodeOut(
                id=sc.id,
                language=sc.language,
                code=sc.code,
            )
            for sc in problem.starter_codes
        ]
    return ProblemOut(
        id=problem.id,
        title=problem.title,
        difficulty=problem.difficulty,
        external_link=problem.external_link,
        description=problem.description,
        tags=problem.tags,
        test_cases=test_cases,
        starter_codes=starter_codes,
    )

def default_starter_codes(title: str) -> List[ProblemStarterCodeIn]:
    title_lower = (title or "").lower()
    if "sum of two numbers" in title_lower:
        return [
            ProblemStarterCodeIn(language="javascript", code="function solve(input) {\n  const [a, b] = input.trim().split(/\\s+/).map(Number);\n  console.log(a + b);\n}\n\nsolve(require('fs').readFileSync(0, 'utf8'));\n"),
            ProblemStarterCodeIn(language="python", code="def solve(data: str):\n    a, b = map(int, data.strip().split())\n    print(a + b)\n\nif __name__ == '__main__':\n    import sys\n    solve(sys.stdin.read())\n"),
            ProblemStarterCodeIn(language="java", code="import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        Scanner sc = new Scanner(System.in);\n        long a = sc.nextLong();\n        long b = sc.nextLong();\n        System.out.println(a + b);\n        sc.close();\n    }\n}\n"),
            ProblemStarterCodeIn(language="cpp", code="#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    long long a, b;\n    if (!(cin >> a >> b)) return 0;\n    cout << (a + b);\n    return 0;\n}\n"),
        ]
    if "valid parentheses" in title_lower:
        return [
            ProblemStarterCodeIn(language="javascript", code="function solve(input) {\n  const s = input.trim();\n  const stack = [];\n  const pairs = { ')': '(', ']': '[', '}': '{' };\n  for (const ch of s) {\n    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);\n    else {\n      if (!stack.length || stack.pop() !== pairs[ch]) {\n        console.log('false');\n        return;\n      }\n    }\n  }\n  console.log(stack.length === 0 ? 'true' : 'false');\n}\n\nsolve(require('fs').readFileSync(0, 'utf8'));\n"),
            ProblemStarterCodeIn(language="python", code="def solve(data: str):\n    s = data.strip()\n    stack = []\n    pairs = {')': '(', ']': '[', '}': '{'}\n    for ch in s:\n        if ch in \"([{\":\n            stack.append(ch)\n        else:\n            if not stack or stack.pop() != pairs.get(ch):\n                print('false')\n                return\n    print('true' if not stack else 'false')\n\nif __name__ == '__main__':\n    import sys\n    solve(sys.stdin.read())\n"),
            ProblemStarterCodeIn(language="java", code="import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        String s = br.readLine();\n        if (s == null) return;\n        Deque<Character> stack = new ArrayDeque<>();\n        Map<Character, Character> pairs = Map.of(')', '(', ']', '[', '}', '{');\n        for (char ch : s.toCharArray()) {\n            if (ch == '(' || ch == '[' || ch == '{') {\n                stack.push(ch);\n            } else {\n                if (stack.isEmpty() || stack.pop() != pairs.get(ch)) {\n                    System.out.println(\"false\");\n                    return;\n                }\n            }\n        }\n        System.out.println(stack.isEmpty() ? \"true\" : \"false\");\n    }\n}\n"),
            ProblemStarterCodeIn(language="cpp", code="#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    string s;\n    if (!getline(cin, s)) return 0;\n    vector<char> st;\n    unordered_map<char, char> pairs{{')','('},{']','['},{'}','{'}};\n    for (char ch : s) {\n        if (ch == '(' || ch == '[' || ch == '{') st.push_back(ch);\n        else {\n            if (st.empty() || st.back() != pairs[ch]) {\n                cout << \"false\";\n                return 0;\n            }\n            st.pop_back();\n        }\n    }\n    cout << (st.empty() ? \"true\" : \"false\");\n    return 0;\n}\n"),
        ]
    return [
        ProblemStarterCodeIn(language="javascript", code="function solve(input) {\n  // TODO: implement\n}\n\nsolve(require('fs').readFileSync(0, 'utf8'));\n"),
        ProblemStarterCodeIn(language="python", code="def solve(data: str):\n    # TODO: implement\n    pass\n\nif __name__ == '__main__':\n    import sys\n    solve(sys.stdin.read())\n"),
        ProblemStarterCodeIn(language="java", code="import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        // TODO: implement\n    }\n}\n"),
        ProblemStarterCodeIn(language="cpp", code="#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // TODO: implement\n    return 0;\n}\n"),
    ]

@router.post("/", response_model=ProblemOut)
def create_problem(data: ProblemIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        tags = db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()
        problem = Problem(
            title=data.title,
            difficulty=data.difficulty,
            external_link=data.external_link,
            description=data.description,
            tags=tags
        )
        db.add(problem)
        db.commit()
        db.refresh(problem)
        if data.test_cases:
            for idx, tc in enumerate(data.test_cases):
                db.add(ProblemTestCase(
                    problem_id=problem.id,
                    input_text=tc.input_text,
                    output_text=tc.output_text,
                    is_sample=tc.is_sample if tc.is_sample is not None else True,
                    order=tc.order if tc.order is not None else idx,
                ))
            db.commit()
            db.refresh(problem)
        starter_codes = data.starter_codes or default_starter_codes(problem.title)
        for sc in starter_codes:
            db.add(ProblemStarterCode(
                problem_id=problem.id,
                language=sc.language,
                code=sc.code,
            ))
        db.commit()
        db.refresh(problem)
        return serialize_problem(problem)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ProblemOut])
def get_all_problems(
    db: Session = Depends(get_db),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    name: Optional[str] = Query(None, description="Filter by problem name (partial match)"),
):
    try:
        query = db.query(Problem)

        if difficulty:
            query = query.filter(func.upper(Problem.difficulty) == difficulty.upper())

        if name:
            query = query.filter(Problem.title.ilike(f"%{name}%"))

        return [serialize_problem(problem) for problem in query.all()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily", response_model=ProblemOut)
def get_daily_problem(db: Session = Depends(get_db)):
    try:
        problems = db.query(Problem).order_by(Problem.id.asc()).all()
        if not problems:
            raise HTTPException(status_code=404, detail="No problems available")
        today_index = datetime.utcnow().toordinal() % len(problems)
        return serialize_problem(problems[today_index])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{problem_id}", response_model=ProblemOut)
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    try:
        problem = db.query(Problem).get(problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        return serialize_problem(problem)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{problem_id}", response_model=ProblemOut)
def update_problem(problem_id: int, data: ProblemIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        problem = db.query(Problem).get(problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        problem.title = data.title
        problem.difficulty = data.difficulty
        problem.external_link = data.external_link
        problem.description = data.description
        problem.tags = db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()
        if data.test_cases is not None:
            db.query(ProblemTestCase).filter(ProblemTestCase.problem_id == problem_id).delete()
            for idx, tc in enumerate(data.test_cases):
                db.add(ProblemTestCase(
                    problem_id=problem_id,
                    input_text=tc.input_text,
                    output_text=tc.output_text,
                    is_sample=tc.is_sample if tc.is_sample is not None else True,
                    order=tc.order if tc.order is not None else idx,
                ))
        if data.starter_codes is not None:
            db.query(ProblemStarterCode).filter(ProblemStarterCode.problem_id == problem_id).delete()
            for sc in data.starter_codes:
                db.add(ProblemStarterCode(
                    problem_id=problem_id,
                    language=sc.language,
                    code=sc.code,
                ))
        db.commit()
        db.refresh(problem)
        return serialize_problem(problem)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{problem_id}")
def delete_problem(problem_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        problem = db.query(Problem).get(problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        db.delete(problem)
        db.commit()
        return {"detail": "Deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
