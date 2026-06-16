from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import Branch, UserProfile


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
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


class BranchDetailSerializer(BranchSerializer):
    agent_count    = serializers.IntegerField(read_only=True)
    it_staff_count = serializers.IntegerField(read_only=True)

    class Meta(BranchSerializer.Meta):
        fields = BranchSerializer.Meta.fields + ('agent_count', 'it_staff_count')


class UserProfileSerializer(serializers.ModelSerializer):
    branch = BranchSerializer(read_only=True)
    open_ticket_count = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = (
            'id', 'first_name', 'last_name', 'email', 'role', 'shift',
            'department', 'branch', 'is_active', 'date_joined', 'open_ticket_count',
        )
        read_only_fields = ('id', 'date_joined')

    def get_open_ticket_count(self, obj):
        return obj.assigned_tickets.filter(
            status__in=['open', 'in_progress']
        ).count()

    def update(self, instance, validated_data):
        role = validated_data.get('role', instance.role)
        if role in UserProfile.IT_ROLES:
            validated_data['department'] = UserProfile.Department.IT_DEPARTMENT
        return super().update(instance, validated_data)


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = UserProfile
        fields = ('id', 'first_name', 'last_name', 'email', 'password', 'role', 'shift', 'department', 'branch', 'is_active')
        read_only_fields = ('id',)

    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.get('role', '')
        if role in UserProfile.IT_ROLES:
            validated_data['department'] = UserProfile.Department.IT_DEPARTMENT
        email = validated_data.get('email', '')
        base = email.split('@')[0].replace('.', '_').replace('-', '_')[:140]
        username = base
        counter = 1
        while UserProfile.objects.filter(username=username).exists():
            username = f'{base}_{counter}'
            counter += 1
        user = UserProfile(username=username, **validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        role = validated_data.get('role', instance.role)
        if role in UserProfile.IT_ROLES:
            validated_data['department'] = UserProfile.Department.IT_DEPARTMENT
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
