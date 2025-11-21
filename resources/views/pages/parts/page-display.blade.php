<div dir="auto">

    <h1 class="break-text" id="bkmrk-page-title" style="font-weight: bold; margin-top: 1rem">{{$page->name}}</h1>

    <hr>

    <div style="clear:left;"></div>

    @if (isset($diff) && $diff)
        {!! $diff !!}
    @else
        {!! isset($page->renderedHTML) ? $page->renderedHTML : $page->html !!}
    @endif
</div>