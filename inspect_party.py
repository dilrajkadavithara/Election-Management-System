import os, sys, django
sys.path.insert(0, '/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

# List all models available to understand party structure
from django.apps import apps
for model in apps.get_models():
    if 'party' in model.__name__.lower():
        print(f"Model: {model.__name__} in app {model._meta.app_label}")
        for field in model._meta.get_fields():
            print(f"  - {field.name}: {field.get_internal_type() if hasattr(field, 'get_internal_type') else type(field).__name__}")
