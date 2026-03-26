from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    password: str
    role: str = "user"

    model_config = ConfigDict(extra="forbid")


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    password: str | None = None

    model_config = ConfigDict(extra="forbid")


class UserResponse(BaseModel):
    id: int | None
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None


class Users(BaseModel):
    data: list[UserResponse]
