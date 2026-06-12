from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import Branch, UserProfile


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        data['user'] = user
        return data


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ('id', 'name', 'location', 'is_main_branch')


class UserProfileSerializer(serializers.ModelSerializer):
    branch = BranchSerializer(read_only=True)
    open_ticket_count = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = (
            'id', 'username', 'first_name', 'last_name', 'email', 'role', 'shift',
            'department', 'branch', 'is_active', 'date_joined', 'open_ticket_count',
        )

    def get_open_ticket_count(self, obj):
        return obj.assigned_tickets.filter(
            status__in=['open', 'in_progress']
        ).count()


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = UserProfile
        fields = ('id', 'username', 'email', 'password', 'role', 'shift', 'department', 'branch', 'is_active')
        read_only_fields = ('id',)

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = UserProfile(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
