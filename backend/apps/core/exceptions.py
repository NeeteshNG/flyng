"""
Custom Exception Handler for FlyNG API
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler that formats all errors consistently.
    """
    response = exception_handler(exc, context)

    if response is not None:
        custom_response_data = {
            'success': False,
            'message': 'An error occurred',
            'errors': None,
        }

        if isinstance(response.data, dict):
            if 'detail' in response.data:
                custom_response_data['message'] = str(response.data['detail'])
            else:
                custom_response_data['errors'] = response.data
                custom_response_data['message'] = 'Validation error'
        elif isinstance(response.data, list):
            custom_response_data['errors'] = response.data
            custom_response_data['message'] = 'Multiple errors occurred'

        response.data = custom_response_data

    return response


class APIException(Exception):
    """Base API Exception"""
    status_code = status.HTTP_400_BAD_REQUEST
    message = 'An error occurred'

    def __init__(self, message=None, status_code=None):
        if message:
            self.message = message
        if status_code:
            self.status_code = status_code
        super().__init__(self.message)


class NotFoundException(APIException):
    """Resource not found exception"""
    status_code = status.HTTP_404_NOT_FOUND
    message = 'Resource not found'


class ValidationException(APIException):
    """Validation error exception"""
    status_code = status.HTTP_400_BAD_REQUEST
    message = 'Validation error'


class UnauthorizedException(APIException):
    """Unauthorized access exception"""
    status_code = status.HTTP_401_UNAUTHORIZED
    message = 'Unauthorized'


class ForbiddenException(APIException):
    """Forbidden access exception"""
    status_code = status.HTTP_403_FORBIDDEN
    message = 'Access forbidden'
