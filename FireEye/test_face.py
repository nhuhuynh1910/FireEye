from services.face_service import (
    register_face_from_image,
    match_face_from_image
)

# register known face
register_result = register_face_from_image(
    name="Huynh Nhu",
    role="Admin",
    image_path="uploads/test_face.jpg"
)

print("REGISTER RESULT:")
print(register_result)

# test match
match_result = match_face_from_image(
    image_path="uploads/test_face.jpg"
)

print("\nMATCH RESULT:")
print(match_result)
