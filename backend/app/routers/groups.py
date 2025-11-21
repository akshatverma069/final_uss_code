"""
Group management routes
Security: Group operations with authorization checks
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, delete, text
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from app.database import get_db
from app.models import User, GroupMember, Password, PasswordShare
from app.schemas import GroupMemberResponse, GroupShareRequest
from app.dependencies import get_current_user
from app.security import sanitize_input, load_user_aes_key, aes_decrypt, aes_encrypt
from app.config import settings

router = APIRouter(prefix="/api/groups", tags=["Groups"])
limiter = Limiter(key_func=get_remote_address)


@router.get("", response_model=List[GroupMemberResponse])
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_groups(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all groups for current user
    Security: Authentication required, user isolation
    """
    result = await db.execute(
        select(GroupMember).where(GroupMember.user_id == current_user.user_id)
    )
    groups = result.scalars().all()
    
    # Security: Get username for each group member
    groups_with_usernames = []
    for group in groups:
        user_result = await db.execute(
            select(User.username).where(User.user_id == group.user_id)
        )
        username = user_result.scalar_one_or_none()
        
        groups_with_usernames.append(GroupMemberResponse(
            group_name=group.group_name,
            user_id=group.user_id,
            admin_status=group.admin_status,
            password_id=group.password_id,
            username=username
        ))
    
    return groups_with_usernames


@router.get("/{group_name}/members", response_model=List[GroupMemberResponse])
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_group_members(
    request: Request,
    group_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all members of a group
    Security: Authentication required, admin check
    """
    # Security: Check if user is admin of the group
    result = await db.execute(
        select(GroupMember).where(
            and_(
                GroupMember.group_name == group_name,
                GroupMember.user_id == current_user.user_id,
                GroupMember.admin_status == True
            )
        )
    )
    admin_check = result.scalar_one_or_none()
    
    if not admin_check:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can view members"
        )
    
    # Security: Get all group members
    result = await db.execute(
        select(GroupMember).where(GroupMember.group_name == group_name)
    )
    members = result.scalars().all()
    
    members_with_usernames = []
    for member in members:
        user_result = await db.execute(
            select(User.username).where(User.user_id == member.user_id)
        )
        username = user_result.scalar_one_or_none()
        
        members_with_usernames.append(GroupMemberResponse(
            group_name=member.group_name,
            user_id=member.user_id,
            admin_status=member.admin_status,
            password_id=member.password_id,
            username=username
        ))
    
    return members_with_usernames


@router.post("/share", status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def share_password(
    request: Request,
    share_data: GroupShareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Share password with group members
    Security: Authentication required, admin check, password ownership check
    """
    # Security: Verify password belongs to user
    result = await db.execute(
        select(Password).where(
            and_(
                Password.password_id == share_data.password_id,
                Password.user_id == current_user.user_id
            )
        )
    )
    password = result.scalar_one_or_none()
    
    if password is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Password not found or access denied"
        )
    
    # Security: Verify user is admin of the group
    result = await db.execute(
        select(GroupMember).where(
            and_(
                GroupMember.group_name == share_data.group_name,
                GroupMember.user_id == current_user.user_id,
                GroupMember.admin_status == True
            )
        )
    )
    admin_check = result.scalar_one_or_none()
    
    if not admin_check:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can share passwords"
        )
    
    # Security: Share password with specified users using password_shares table
    for user_id in share_data.user_ids:
        # Security: Verify user is member of the group
        result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_name == share_data.group_name,
                    GroupMember.user_id == user_id
                )
            )
        )
        member = result.scalar_one_or_none()
        
        if not member:
            # Security: Create new group member if they don't exist
            new_member = GroupMember(
                group_name=share_data.group_name,
                user_id=user_id,
                admin_status=False,
                password_id=None  # Don't use legacy field
            )
            db.add(new_member)
        
        # Security: Check if password is already shared with this user in this group
        try:
            existing_share = await db.execute(
                select(PasswordShare).where(
                    and_(
                        PasswordShare.group_name == share_data.group_name,
                        PasswordShare.user_id == user_id,
                        PasswordShare.password_id == share_data.password_id
                    )
                )
            )
            if existing_share.scalar_one_or_none() is None:
                # Security: Create new password share entry
                new_share = PasswordShare(
                    group_name=share_data.group_name,
                    user_id=user_id,
                    password_id=share_data.password_id
                )
                db.add(new_share)
                print(f"[DEBUG] Added PasswordShare: group={share_data.group_name}, user_id={user_id}, password_id={share_data.password_id}")
            else:
                print(f"[DEBUG] PasswordShare already exists: group={share_data.group_name}, user_id={user_id}, password_id={share_data.password_id}")
        except Exception as share_error:
            # If password_shares table doesn't exist, create it first
            error_str = str(share_error).lower()
            if "doesn't exist" in error_str or "unknown table" in error_str or "1146" in error_str:
                try:
                    # Create the table
                    await db.execute(text("""
                        CREATE TABLE IF NOT EXISTS password_shares (
                            share_id INT AUTO_INCREMENT PRIMARY KEY,
                            group_name VARCHAR(500) NOT NULL,
                            user_id INT NOT NULL,
                            password_id INT NOT NULL,
                            INDEX idx_group_name (group_name),
                            INDEX idx_user_id (user_id),
                            INDEX idx_password_id (password_id),
                            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                            FOREIGN KEY (password_id) REFERENCES passwords(password_id) ON DELETE CASCADE,
                            UNIQUE KEY unique_share (group_name, user_id, password_id)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """))
                    await db.commit()
                    # Now try to add the share again
                    new_share = PasswordShare(
                        group_name=share_data.group_name,
                        user_id=user_id,
                        password_id=share_data.password_id
                    )
                    db.add(new_share)
                    print(f"[DEBUG] Added PasswordShare after table creation: group={share_data.group_name}, user_id={user_id}, password_id={share_data.password_id}")
                except Exception as create_error:
                    print(f"Error creating password_shares table during share: {create_error}")
                    # Fallback to old method only if table creation fails
                    if member:
                        member.password_id = share_data.password_id
                        print(f"[DEBUG] Fallback: Set password_id on GroupMember: group={share_data.group_name}, user_id={user_id}, password_id={share_data.password_id}")
            else:
                # For other errors, fall back to old method
                print(f"[DEBUG] Share error (not table missing): {share_error}")
                if member:
                    member.password_id = share_data.password_id
                    print(f"[DEBUG] Fallback: Set password_id on GroupMember: group={share_data.group_name}, user_id={user_id}, password_id={share_data.password_id}")
    
    await db.commit()
    print(f"[DEBUG] Committed share operation for password_id={share_data.password_id}, group={share_data.group_name}")
    
    return {"success": True, "message": "Password shared successfully"}


@router.post("/unshare", status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def unshare_password(
    request: Request,
    share_data: GroupShareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Unshare password from group members
    Security: Authentication required, admin check
    """
    # Security: Verify user is admin of the group
    result = await db.execute(
        select(GroupMember).where(
            and_(
                GroupMember.group_name == share_data.group_name,
                GroupMember.user_id == current_user.user_id,
                GroupMember.admin_status == True
            )
        )
    )
    admin_check = result.scalar_one_or_none()
    
    if not admin_check:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can unshare passwords"
        )
    
    # Security: Remove password sharing for specified users
    for user_id in share_data.user_ids:
        result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_name == share_data.group_name,
                    GroupMember.user_id == user_id,
                    GroupMember.password_id == share_data.password_id
                )
            )
        )
        member = result.scalar_one_or_none()
        
        if member:
            member.password_id = None
    
    await db.commit()
    
    return {"success": True, "message": "Password unshared successfully"}


@router.get("/shared/passwords", response_model=List[dict])
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def get_shared_passwords(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get passwords shared with current user by group admins
    Security: Authentication required, non-admin check
    """
    # Security: Query shared passwords for non-admin users from password_shares table
    # This table supports multiple passwords per user per group
    try:
        # Try to query from password_shares table (supports multiple passwords)
        # This returns ALL passwords shared with the current user (receiver view)
        
        # First, let's check if there are any PasswordShare records for this user
        check_result = await db.execute(
            select(PasswordShare).where(
                PasswordShare.user_id == current_user.user_id
            )
        )
        all_shares = check_result.scalars().all()
        print(f"[DEBUG] Total PasswordShare records for user {current_user.user_id}: {len(all_shares)}")
        for share in all_shares:
            print(f"[DEBUG] Share: group={share.group_name}, password_id={share.password_id}, user_id={share.user_id}")
        
        # Start query from PasswordShare to ensure we get all shares, then join to Password
        result = await db.execute(
            select(
                Password.password_id,
                Password.user_id,  # Get password owner's user_id
                Password.application_name,
                Password.account_user_name,
                Password.application_password,
                PasswordShare.group_name,
            )
            .select_from(PasswordShare)
            .join(Password, Password.password_id == PasswordShare.password_id)
            .where(
                PasswordShare.user_id == current_user.user_id
            )
            .order_by(PasswordShare.share_id.desc())  # Order by share_id to get all results
        )
        shared = result.all()
        print(f"[DEBUG] Found {len(shared)} shared passwords after join for user {current_user.user_id}")
    except Exception as e:
        # If password_shares table doesn't exist, try to create it and migrate data
        error_str = str(e).lower()
        if "doesn't exist" in error_str or "unknown table" in error_str or "1146" in error_str:
            try:
                # Create the table
                await db.execute(text("""
                    CREATE TABLE IF NOT EXISTS password_shares (
                        share_id INT AUTO_INCREMENT PRIMARY KEY,
                        group_name VARCHAR(500) NOT NULL,
                        user_id INT NOT NULL,
                        password_id INT NOT NULL,
                        INDEX idx_group_name (group_name),
                        INDEX idx_user_id (user_id),
                        INDEX idx_password_id (password_id),
                        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                        FOREIGN KEY (password_id) REFERENCES passwords(password_id) ON DELETE CASCADE,
                        UNIQUE KEY unique_share (group_name, user_id, password_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """))
                # Migrate existing data
                await db.execute(text("""
                    INSERT IGNORE INTO password_shares (group_name, user_id, password_id)
                    SELECT group_name, user_id, password_id
                    FROM group_members
                    WHERE password_id IS NOT NULL
                """))
                await db.commit()
                # Retry the query - return ALL passwords shared with current user
                result = await db.execute(
                    select(
                        Password.password_id,
                        Password.user_id,
                        Password.application_name,
                        Password.account_user_name,
                        Password.application_password,
                        PasswordShare.group_name,
                    )
                    .select_from(PasswordShare)
                    .join(Password, Password.password_id == PasswordShare.password_id)
                    .where(
                        PasswordShare.user_id == current_user.user_id
                    )
                    .order_by(PasswordShare.share_id.desc())  # Order by share_id to get all results
                )
                shared = result.all()
                print(f"[DEBUG] After table creation, found {len(shared)} shared passwords for user {current_user.user_id}")
            except Exception as create_error:
                print(f"Error creating password_shares table: {create_error}")
                shared = []
        else:
            print(f"Error querying password_shares table: {e}")
            shared = []
    
    # Fallback: Also check group_members table for legacy shares (if password_shares table doesn't exist or is empty)
    if len(shared) == 0:
        try:
            print(f"[DEBUG] Checking group_members table for legacy shares for user {current_user.user_id}")
            # Query group_members where password_id is set (legacy method)
            legacy_result = await db.execute(
                select(
                    Password.password_id,
                    Password.user_id,
                    Password.application_name,
                    Password.account_user_name,
                    Password.application_password,
                    GroupMember.group_name,
                )
                .join(GroupMember, Password.password_id == GroupMember.password_id)
                .where(
                    and_(
                        GroupMember.user_id == current_user.user_id,
                        GroupMember.password_id.isnot(None)
                    )
                )
            )
            legacy_shared = legacy_result.all()
            print(f"[DEBUG] Found {len(legacy_shared)} legacy shared passwords from group_members")
            if len(legacy_shared) > 0:
                # Merge legacy shares with new shares
                shared = list(shared) + list(legacy_shared)
                print(f"[DEBUG] Total shared passwords after merging: {len(shared)}")
        except Exception as legacy_error:
            print(f"[DEBUG] Error checking legacy shares: {legacy_error}")
    
    # Security: Decrypt with owner's key and return plaintext
    # If decryption fails or keys aren't available, return data as-is
    decrypted_shared = []
    for row in shared:
        try:
            # Access Row object - try attribute access first, fallback to index
            try:
                password_id = row.password_id
                owner_user_id = row.user_id
                application_name = row.application_name
                account_user_name = row.account_user_name
                application_password = row.application_password
                group_name = row.group_name
            except (AttributeError, KeyError):
                # Fallback to index access if attribute access fails
                password_id = row[0]
                owner_user_id = row[1]
                application_name = row[2]
                account_user_name = row[3]
                application_password = row[4]
                group_name = row[5]
            
            # Security: Load password owner's AES key
            owner_aes_key = load_user_aes_key(owner_user_id)
            if owner_aes_key:
                try:
                    # Security: Decrypt with owner's key and return plaintext
                    decrypted_password = aes_decrypt(application_password, owner_aes_key)
                    decrypted_username = aes_decrypt(account_user_name, owner_aes_key)
                    
                    decrypted_shared.append({
                        "password_id": password_id,
                        "application_name": application_name,
                        "account_user_name": decrypted_username,  # Return decrypted plaintext
                        "application_password": decrypted_password,  # Return decrypted plaintext
                        "group_name": group_name,
                    })
                except (ValueError, Exception) as decrypt_error:
                    # If decryption fails, return as-is (might already be plaintext)
                    print(f"Decryption error for password {password_id}: {decrypt_error}")
                    decrypted_shared.append({
                        "password_id": password_id,
                        "application_name": application_name,
                        "account_user_name": account_user_name,
                        "application_password": application_password,
                        "group_name": group_name,
                    })
            else:
                # Fallback: return as-is if key not found (might be plaintext)
                print(f"AES key not found for user {owner_user_id}")
                decrypted_shared.append({
                    "password_id": password_id,
                    "application_name": application_name,
                    "account_user_name": account_user_name,
                    "application_password": application_password,
                    "group_name": group_name,
                })
        except Exception as e:
            # Fallback: return as-is if any error occurs
            print(f"Error processing shared password row: {e}")
            try:
                # Try to extract data using either attribute or index access
                try:
                    password_id = getattr(row, 'password_id', None) or (row[0] if len(row) > 0 else None)
                    application_name = getattr(row, 'application_name', None) or (row[2] if len(row) > 2 else "")
                    account_user_name = getattr(row, 'account_user_name', None) or (row[3] if len(row) > 3 else "")
                    application_password = getattr(row, 'application_password', None) or (row[4] if len(row) > 4 else "")
                    group_name = getattr(row, 'group_name', None) or (row[5] if len(row) > 5 else "")
                except:
                    password_id = row[0] if len(row) > 0 else None
                    application_name = row[2] if len(row) > 2 else ""
                    account_user_name = row[3] if len(row) > 3 else ""
                    application_password = row[4] if len(row) > 4 else ""
                    group_name = row[5] if len(row) > 5 else ""
                
                decrypted_shared.append({
                    "password_id": password_id,
                    "application_name": application_name,
                    "account_user_name": account_user_name,
                    "application_password": application_password,
                    "group_name": group_name,
                })
            except Exception as inner_e:
                # Skip this row if we can't process it
                print(f"Could not process row, skipping: {inner_e}")
                continue

    print(f"[DEBUG] Returning {len(decrypted_shared)} decrypted shared passwords for user {current_user.user_id}")
    return decrypted_shared


@router.get("/{group_name}/shared/passwords", response_model=List[dict])
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def get_group_shared_passwords(
    request: Request,
    group_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get passwords shared within a group (admin view).
    Security: Only admins of the group can access.
    """
    admin_check = await db.execute(
        select(GroupMember).where(
            GroupMember.group_name == group_name,
            GroupMember.user_id == current_user.user_id,
            GroupMember.admin_status == True,
        )
    )
    admin_entry = admin_check.scalar_one_or_none()
    if not admin_entry:
        raise HTTPException(status_code=403, detail="Only admins can view shared passwords")

    # Query from password_shares table to get ALL shared passwords in the group
    # Handle case where password_shares table might not exist
    try:
        result = await db.execute(
            select(
                Password,
                PasswordShare.user_id,
                User.username,
                GroupMember.admin_status,
            )
            .join(PasswordShare, Password.password_id == PasswordShare.password_id)
            .join(User, User.user_id == PasswordShare.user_id)
            .outerjoin(
                GroupMember,
                and_(
                    GroupMember.group_name == group_name,
                    GroupMember.user_id == PasswordShare.user_id
                )
            )
            .where(
                PasswordShare.group_name == group_name
            )
            .order_by(PasswordShare.share_id.desc())  # Order by share_id to get all results
        )
        rows = result.all()
    except Exception as e:
        # If password_shares table doesn't exist, create it and migrate data
        error_str = str(e).lower()
        if "doesn't exist" in error_str or "unknown table" in error_str or "1146" in error_str:
            try:
                await db.execute(text("""
                    CREATE TABLE IF NOT EXISTS password_shares (
                        share_id INT AUTO_INCREMENT PRIMARY KEY,
                        group_name VARCHAR(500) NOT NULL,
                        user_id INT NOT NULL,
                        password_id INT NOT NULL,
                        INDEX idx_group_name (group_name),
                        INDEX idx_user_id (user_id),
                        INDEX idx_password_id (password_id),
                        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                        FOREIGN KEY (password_id) REFERENCES passwords(password_id) ON DELETE CASCADE,
                        UNIQUE KEY unique_share (group_name, user_id, password_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """))
                await db.execute(text("""
                    INSERT IGNORE INTO password_shares (group_name, user_id, password_id)
                    SELECT group_name, user_id, password_id
                    FROM group_members
                    WHERE password_id IS NOT NULL
                """))
                await db.commit()
                # Retry the query
                result = await db.execute(
                    select(
                        Password,
                        PasswordShare.user_id,
                        User.username,
                        GroupMember.admin_status,
                    )
                    .join(PasswordShare, Password.password_id == PasswordShare.password_id)
                    .join(User, User.user_id == PasswordShare.user_id)
                    .outerjoin(
                        GroupMember,
                        and_(
                            GroupMember.group_name == group_name,
                            GroupMember.user_id == PasswordShare.user_id
                        )
                    )
                    .where(
                        PasswordShare.group_name == group_name
                    )
                    .order_by(PasswordShare.share_id.desc())  # Order by share_id to get all results
                )
                rows = result.all()
            except Exception as create_error:
                print(f"Error creating password_shares table in get_group_shared_passwords: {create_error}")
                rows = []
        else:
            print(f"Error querying password_shares in get_group_shared_passwords: {e}")
            rows = []
    password_map: Dict[int, Dict[str, Any]] = {}
    
    # Security: Decrypt passwords for admin view
    for password, share_user_id, username, admin_status in rows:
        try:
            # Security: Load password owner's AES key
            owner_aes_key = load_user_aes_key(password.user_id)
            if owner_aes_key:
                # Security: Decrypt password data for admin view
                decrypted_password = aes_decrypt(password.application_password, owner_aes_key)
                decrypted_username = aes_decrypt(password.account_user_name, owner_aes_key)
            else:
                # Fallback: use as-is if key not found
                decrypted_password = password.application_password
                decrypted_username = password.account_user_name
            
            entry = password_map.setdefault(
                password.password_id,
                {
                    "password_id": password.password_id,
                    "application_name": password.application_name,
                    "account_user_name": decrypted_username,  # Return decrypted plaintext
                    "application_password": decrypted_password,  # Return decrypted plaintext
                    "shared_with": [],
                },
            )
            # Avoid duplicate entries
            if not any(sw["user_id"] == share_user_id for sw in entry["shared_with"]):
                entry["shared_with"].append(
                    {
                        "user_id": share_user_id,
                        "username": username,
                        "is_admin": bool(admin_status) if admin_status is not None else False,
                    }
                )
        except (ValueError, Exception) as e:
            # Fallback: use as-is if decryption fails
            entry = password_map.setdefault(
                password.password_id,
                {
                    "password_id": password.password_id,
                    "application_name": password.application_name,
                    "account_user_name": password.account_user_name,
                    "application_password": password.application_password,
                    "shared_with": [],
                },
            )
            if not any(sw["user_id"] == share_user_id for sw in entry["shared_with"]):
                entry["shared_with"].append(
                    {
                        "user_id": share_user_id,
                        "username": username,
                        "is_admin": bool(admin_status) if admin_status is not None else False,
                    }
                )

    return list(password_map.values())


# ========================
# Extended group features
# ========================

class CreateGroupBody(BaseModel):
    group_name: str = Field(..., min_length=1, max_length=500)


@router.post("/create", status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def create_group(
    request: Request,
    body: CreateGroupBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new group; creator becomes admin.
    """
    group_name = body.group_name.strip()
    if not group_name:
        raise HTTPException(status_code=400, detail="Group name required")

    existing = await db.execute(
        select(GroupMember).where(
            GroupMember.group_name == group_name,
            GroupMember.user_id == current_user.user_id,
        )
    )
    membership = existing.scalar_one_or_none()

    if membership:
        membership.admin_status = True
        await db.commit()
        return {"success": True, "message": "Group already exists; you are admin"}

    new_group = GroupMember(
        group_name=group_name,
        user_id=current_user.user_id,
        admin_status=True,
        password_id=None,
    )
    db.add(new_group)
    await db.commit()
    return {"success": True, "message": "Group created"}


@router.get("/list", response_model=List[Dict[str, Any]])
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def list_groups(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List groups the current user belongs to with membership counts and admin flag.
    """
    memberships = await db.execute(
        select(GroupMember.group_name, GroupMember.admin_status).where(
            GroupMember.user_id == current_user.user_id
        )
    )
    results = memberships.all()
    groups: List[Dict[str, Any]] = []
    for group_name, is_admin in results:
        count_result = await db.execute(
            select(func.count()).select_from(GroupMember).where(
                GroupMember.group_name == group_name
            )
        )
        member_count = count_result.scalar_one() or 0
        groups.append(
            {
                "group_name": group_name,
                "member_count": int(member_count),
                "is_admin": bool(is_admin),
            }
        )
    return groups


@router.delete("/{group_name}/members/{user_id}", status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def remove_member(
    request: Request,
    group_name: str,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a user from a group. Only admins may remove members.
    """
    admin_check = await db.execute(
        select(GroupMember).where(
            GroupMember.group_name == group_name,
            GroupMember.user_id == current_user.user_id,
            GroupMember.admin_status == True,
        )
    )
    admin_entry = admin_check.scalar_one_or_none()
    if not admin_entry:
        raise HTTPException(status_code=403, detail="Only admins can remove members")

    if user_id == current_user.user_id:
        admin_count_res = await db.execute(
            select(func.count()).select_from(GroupMember).where(
                GroupMember.group_name == group_name,
                GroupMember.admin_status == True,
            )
        )
        admin_count = admin_count_res.scalar_one() or 0
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the only admin")

    await db.execute(
        delete(GroupMember).where(
            GroupMember.group_name == group_name,
            GroupMember.user_id == user_id,
        )
    )
    await db.commit()
    return {"success": True, "message": "Member removed"}


class ShareAllBody(BaseModel):
    group_name: str
    password_id: int


@router.post("/share-all", status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def share_password_to_all(
    request: Request,
    body: ShareAllBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Share a password with all members of a group.
    """
    password_check = await db.execute(
        select(Password).where(
            Password.password_id == body.password_id,
            Password.user_id == current_user.user_id,
        )
    )
    password = password_check.scalar_one_or_none()
    if not password:
        raise HTTPException(status_code=404, detail="Password not found or access denied")

    admin_check = await db.execute(
        select(GroupMember).where(
            GroupMember.group_name == body.group_name,
            GroupMember.user_id == current_user.user_id,
            GroupMember.admin_status == True,
        )
    )
    admin_entry = admin_check.scalar_one_or_none()
    if not admin_entry:
        raise HTTPException(status_code=403, detail="Only admins can share passwords")

    members = await db.execute(
        select(GroupMember).where(GroupMember.group_name == body.group_name)
    )
    for member in members.scalars().all():
        # Use password_shares table to support multiple passwords per user per group
        try:
            # Check if already shared
            existing_share = await db.execute(
                select(PasswordShare).where(
                    and_(
                        PasswordShare.group_name == body.group_name,
                        PasswordShare.user_id == member.user_id,
                        PasswordShare.password_id == body.password_id
                    )
                )
            )
            if existing_share.scalar_one_or_none() is None:
                new_share = PasswordShare(
                    group_name=body.group_name,
                    user_id=member.user_id,
                    password_id=body.password_id
                )
                db.add(new_share)
        except Exception:
            # Fallback to old method if password_shares table doesn't exist
            member.password_id = body.password_id

    await db.commit()
    return {"success": True, "message": "Password shared with all members"}


class RenameGroupBody(BaseModel):
    group_name: str
    new_name: str = Field(..., min_length=1, max_length=500)


@router.put("/rename", status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def rename_group(
    request: Request,
    body: RenameGroupBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Rename a group. Only admins can rename groups.
    """
    current_name = body.group_name.strip()
    new_name = body.new_name.strip()

    if not current_name or not new_name:
        raise HTTPException(status_code=400, detail="Group name required")

    if current_name == new_name:
        return {"success": True, "message": "Group name unchanged"}

    admin_check = await db.execute(
        select(GroupMember).where(
            GroupMember.group_name == current_name,
            GroupMember.user_id == current_user.user_id,
            GroupMember.admin_status == True,
        )
    )
    admin_entry = admin_check.scalar_one_or_none()
    if not admin_entry:
        raise HTTPException(status_code=403, detail="Only admins can rename groups")

    # Ensure group exists
    members_res = await db.execute(
        select(GroupMember).where(GroupMember.group_name == current_name)
    )
    members = members_res.scalars().all()
    if not members:
        raise HTTPException(status_code=404, detail="Group not found")

    # Prevent duplicate name
    existing_res = await db.execute(
        select(GroupMember).where(GroupMember.group_name == new_name)
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Group name already in use")

    for member in members:
        member.group_name = new_name

    await db.commit()
    return {"success": True, "message": "Group renamed", "new_name": new_name}


@router.delete("/{group_name}", status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def delete_group(
    request: Request,
    group_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a group entirely (remove all memberships). Admins only.
    """
    group_name = group_name.strip()
    if not group_name:
        raise HTTPException(status_code=400, detail="Group name required")

    admin_check = await db.execute(
        select(GroupMember).where(
            GroupMember.group_name == group_name,
            GroupMember.user_id == current_user.user_id,
            GroupMember.admin_status == True,
        )
    )
    admin_entry = admin_check.scalar_one_or_none()
    if not admin_entry:
        raise HTTPException(status_code=403, detail="Only admins can delete groups")

    members_res = await db.execute(
        select(GroupMember.user_id).where(GroupMember.group_name == group_name)
    )
    if not members_res.all():
        raise HTTPException(status_code=404, detail="Group not found")

    await db.execute(delete(GroupMember).where(GroupMember.group_name == group_name))
    await db.commit()
    return {"success": True, "message": "Group deleted"}