<form action="{{ url('/watching/update') }}" method="POST">
    {{ csrf_field() }}
    {{ method_field('PUT') }}
    <input type="hidden" name="type" value="{{ $entity->getMorphClass() }}">
    <input type="hidden" name="id" value="{{ $entity->id }}">
    <button type="submit"
            name="level"
            value="updates"
            class="icon-list-item text-link">
        <span>
            <i class="svg-icon" data-lucide="eye"></i>
        </span>
        <span>{{ trans('entities.watch') }}</span>
    </button>
</form>