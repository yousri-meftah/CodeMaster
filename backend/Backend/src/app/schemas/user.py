from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    name: str | None
    email: EmailStr| None
    phone : Optional[str] = None

    model_config = ConfigDict(extra="forbid")

class UserCreate(UserBase):
    password: str
    role: str = "user"

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int| None
    #created_at: datetime



class Users(BaseModel):
    data: list[UserResponse]
