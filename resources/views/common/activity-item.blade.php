
{{--Requires an Activity item with the name $activity passed in--}}

<div style="display: flex; width: 20px;">
    <i class="svg-icon" style="width: 100%; height: auto; stroke-width: 2px; margin-inline-end: 0" data-lucide="circle-user-round"></i>
</div>

<div>
    @if($activity->user)
        <a href="{{ $activity->user->getProfileUrl() }}">{{ $activity->user->name }}</a>
    @else
        {{ trans('common.deleted_user') }}
    @endif

    {{ $activity->getText() }}

    @if($activity->loggable && is_null($activity->loggable->deleted_at))
        <a href="{{ $activity->loggable->getUrl() }}">{{ $activity->loggable->name }}</a>
    @endif

    @if($activity->loggable && !is_null($activity->loggable->deleted_at))
        "{{ $activity->loggable->name }}"
    @endif

    <br>

    <span class="text-muted"><small>@icon('time'){{ $activity->created_at->diffForHumans() }}</small></span>
</div>
