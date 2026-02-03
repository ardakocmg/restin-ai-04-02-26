"""Policy enforcement"""
from core.errors import forbidden

class Policy:
    @staticmethod
    def require(user, perm: str):
        perms = set(getattr(user, "permissions", []) or [])
        if perm not in perms:
            raise forbidden(f"Missing permission: {perm}")
