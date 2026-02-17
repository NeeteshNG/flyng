"""
Core URLs
"""
from django.urls import path

from .views import ArchitectureView

app_name = 'core'

urlpatterns = [
    path('architecture/', ArchitectureView.as_view(), name='architecture'),
]
